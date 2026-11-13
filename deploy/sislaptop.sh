#!/usr/bin/env bash
# Despliegue del sistema de laptops en el k3s del VPS (sislaptop.khipuquantum.com).
# Se ejecuta desde tu PC con Git Bash; habla con el VPS por SSH (alias «muyu»
# de ~/.ssh/config, el mismo que usa Muyu). En la PC solo hace falta Docker
# Desktop con sesión en Harbor (docker login registry.khipuquantum.com).
#
#   bash deploy/sislaptop.sh secretos            crea las claves y las carga en el VPS
#   bash deploy/sislaptop.sh publicar 1.0.0      construye, sube a Harbor y despliega
#   bash deploy/sislaptop.sh iniciar-base        crea las tablas y el admin (una vez)
#   bash deploy/sislaptop.sh estado              pod, discos, dominio y certificado
#   bash deploy/sislaptop.sh registro [postgres] últimas líneas del registro
#   bash deploy/sislaptop.sh volver 1.0.0        vuelve a una versión ya publicada
#   bash deploy/sislaptop.sh copia-ahora         hace la copia diaria en este momento
#   bash deploy/sislaptop.sh bajar-copia         baja la última copia a copias-sislaptop/
set -euo pipefail
# Git Bash reescribe rutas como /copias si no se le dice que no
export MSYS_NO_PATHCONV=1

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# git de Windows no entiende /d/...: la carpeta va en su forma (D:\...)
RAIZ_GIT="$(cygpath -w "$RAIZ" 2>/dev/null || printf '%s' "$RAIZ")"
MANIFIESTO="$RAIZ/deploy/k8s/sislaptop.yaml"
SECRETOS="$RAIZ/deploy/secretos/sislaptop.env"
COPIAS="$RAIZ/copias-sislaptop"
IMAGEN="${REGISTRO:-registry.khipuquantum.com}/sislaptop/sislaptop"
VPS="${VPS:-muyu}"
NS=sislaptop
# Espacio del VPS del que se copia el acceso a Harbor (el mismo que usa Muyu)
ORIGEN_REGISTRO="${ORIGEN_REGISTRO:-kquantum}"

info()  { printf '\033[36m==>\033[0m %s\n' "$*"; }
aviso() { printf '\033[33m!!\033[0m  %s\n' "$*"; }
morir() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
confirmar() { read -r -p "$1 Escribe 'si' para seguir: " r; [[ "$r" == "si" ]] || morir "Cancelado."; }

# kubectl del VPS, con los argumentos escapados para que lleguen tal cual
kube() { ssh "$VPS" "KUBECONFIG=\$HOME/.kube/config kubectl $(printf '%q ' "$@")"; }
aplicar_stdin() { ssh "$VPS" 'KUBECONFIG=$HOME/.kube/config kubectl apply -f -'; }

version_actual() { grep -oE "$IMAGEN:[0-9]+\.[0-9]+\.[0-9]+" "$MANIFIESTO" | head -1 | cut -d: -f2; }
poner_version() { sed -i -E "s#($IMAGEN):[0-9]+\.[0-9]+\.[0-9]+#\1:$1#" "$MANIFIESTO"; }
exigir_version() { [[ "${1:-}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || morir "Indica la versión, por ejemplo: $0 $2 1.0.0"; }

crear_espacio() {
  # Con apply (no create): así el «publicar» de después no se queja del espacio
  ssh "$VPS" "export KUBECONFIG=\$HOME/.kube/config; \
    kubectl create namespace $NS --dry-run=client -o yaml | kubectl apply -f - >/dev/null"
}

secretos() {
  if [[ ! -f "$SECRETOS" ]]; then
    mkdir -p "$(dirname "$SECRETOS")"
    {
      echo "# Secretos del sistema de laptops. NO va a git. Guarda una copia fuera de esta PC."
      echo "DB_PASSWORD=$(openssl rand -hex 24)"
      echo "JWT_SECRET=$(openssl rand -hex 48)"
    } > "$SECRETOS"
    info "Creado $SECRETOS con claves al azar. Guarda una copia en un lugar seguro."
  fi
  crear_espacio

  # La clave de la base solo se usa al crearla: cambiarla después en el Secret
  # deja a la app sin poder entrar. Por eso no se cambia sin pedirlo.
  local remoto local_
  remoto="$(kube -n "$NS" get secret sislaptop -o 'go-template={{range $k,$v := .data}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null || true)"
  if [[ -n "$remoto" ]]; then
    local_="$(grep -E '^[A-Z_]+=' "$SECRETOS" | tr -d '\r' | sort | while IFS='=' read -r k v; do printf '%s=%s\n' "$k" "$(printf '%s' "$v" | base64 -w0)"; done)"
    if [[ "$(sort <<<"$remoto")" != "$local_" ]]; then
      [[ "${CAMBIAR_LLAVES:-}" == si ]] \
        || morir "Tu $SECRETOS no coincide con las claves que ya están en el VPS. Si de verdad quieres cambiarlas: CAMBIAR_LLAVES=si (la de la base habría que cambiarla también dentro de PostgreSQL)."
      aviso "Cambiando las claves del VPS a pedido (CAMBIAR_LLAVES=si)."
    fi
  fi

  # Se manda por la entrada estándar: el archivo no queda guardado en el VPS
  ssh "$VPS" "export KUBECONFIG=\$HOME/.kube/config; kubectl -n $NS create secret generic sislaptop \
    --from-env-file=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -" \
    < <(grep -E '^[A-Z_]+=' "$SECRETOS" | tr -d '\r')

  # Acceso a Harbor: el mismo que usan los otros proyectos del VPS. Se copia
  # dentro del VPS, sin pasar por tu PC.
  ssh "$VPS" "export KUBECONFIG=\$HOME/.kube/config; \
    kubectl -n $ORIGEN_REGISTRO get secret harbor-pull -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d \
    | kubectl -n $NS create secret generic harbor-pull --type=kubernetes.io/dockerconfigjson \
        --from-file=.dockerconfigjson=/dev/stdin --dry-run=client -o yaml | kubectl apply -f -"
  info "Secretos cargados en el espacio $NS del VPS."
}

publicar() {
  local v="${1:-}"
  exigir_version "$v" publicar
  [[ -d "$RAIZ/server" && -d "$RAIZ/client" ]] \
    || morir "Faltan las carpetas server/ y client/ en $RAIZ: sin el código no hay imagen que construir."
  kube -n "$NS" get secret sislaptop >/dev/null 2>&1 \
    || morir "Faltan los secretos en el VPS: ejecuta primero  bash deploy/sislaptop.sh secretos"
  [[ -z "$(git -C "$RAIZ_GIT" status --porcelain -- server client package.json package-lock.json Dockerfile)" ]] \
    || aviso "Hay cambios sin guardar en git: la imagen $v no corresponderá a ningún commit."

  info "Construyendo $IMAGEN:$v"
  (cd "$RAIZ" && docker build --pull -t "$IMAGEN:$v" .)
  info "Subiendo a Harbor"
  docker push "$IMAGEN:$v"

  local antes; antes="$(version_actual)"
  poner_version "$v"
  info "Desplegando $antes → $v"
  aplicar_stdin < "$MANIFIESTO"
  if ! kube -n "$NS" rollout status deploy/sislaptop --timeout=300s; then
    aviso "El pod no quedó listo. Mira:  bash deploy/sislaptop.sh registro"
    aviso "Para volver a la versión anterior:  bash deploy/sislaptop.sh volver $antes"
    exit 1
  fi
  git -C "$RAIZ_GIT" commit -q -m "Despliegue: sislaptop $v en el VPS" -- deploy/k8s/sislaptop.yaml \
    && git -C "$RAIZ_GIT" tag -f -a "sislaptop-v$v" -m "sislaptop $v" >/dev/null \
    && info "Guardado en git con la etiqueta sislaptop-v$v (súbelo con: git push --follow-tags)" \
    || aviso "No se pudo guardar en git el cambio de versión del manifiesto: hazlo a mano."
  info "Listo: https://sislaptop.khipuquantum.com"
}

volver() {
  local v="${1:-}"
  exigir_version "$v" volver
  poner_version "$v"
  aplicar_stdin < "$MANIFIESTO"
  kube -n "$NS" rollout status deploy/sislaptop --timeout=300s
  aviso "El manifiesto quedó en $v: guárdalo en git."
}

iniciar_base() {
  aviso "Esto ejecuta server/initDb.js dentro del pod: crea las tablas y el usuario administrador."
  aviso "Hazlo solo la primera vez, salvo que sepas que initDb.js no borra datos."
  confirmar "¿Inicializar la base de sislaptop?"
  kube -n "$NS" exec deploy/sislaptop -c app -- node server/initDb.js
  aviso "Entra con el administrador por defecto y CAMBIA SU CONTRASEÑA en seguida: el README la publica."
}

estado() {
  kube -n "$NS" get pods,pvc,ingress,certificate,cronjob -o wide
}

registro() {
  local c="${1:-app}"
  kube -n "$NS" logs deploy/sislaptop -c "$c" --tail=100
}

copia_ahora() {
  local job="copia-$(date +%Y%m%d-%H%M%S)"
  kube -n "$NS" create job "$job" --from=cronjob/copia-diaria
  kube -n "$NS" wait --for=condition=complete "job/$job" --timeout=900s
  kube -n "$NS" logs "job/$job"
}

bajar_copia() {
  local ultima
  ultima="$(kube -n "$NS" exec deploy/sislaptop -c postgres -- sh -c 'ls -1 /copias/base-*.dump 2>/dev/null | sort | tail -1' | tr -d '\r')"
  [[ -n "$ultima" ]] || morir "Todavía no hay copias en el VPS (prueba con: bash deploy/sislaptop.sh copia-ahora)."
  mkdir -p "$COPIAS"
  local nombre fecha
  nombre="$(basename "$ultima")"          # base-AAAA-MM-DD-HHMM.dump
  fecha="${nombre#base-}"; fecha="${fecha%.dump}"
  info "Bajando $nombre y fotos.tar.gz a $COPIAS"
  kube -n "$NS" exec deploy/sislaptop -c postgres -- cat "$ultima" > "$COPIAS/$nombre"
  kube -n "$NS" exec deploy/sislaptop -c postgres -- cat /copias/fotos.tar.gz > "$COPIAS/fotos-$fecha.tar.gz"
  # Se guardan las 30 más recientes
  ls -1t "$COPIAS"/base-*.dump 2>/dev/null | tail -n +31 | xargs -r rm -f
  ls -1t "$COPIAS"/fotos-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
  ls -lh "$COPIAS"
}

case "${1:-}" in
  secretos)     secretos ;;
  publicar)     publicar "${2:-}" ;;
  volver)       volver "${2:-}" ;;
  iniciar-base) iniciar_base ;;
  estado)       estado ;;
  registro)     registro "${2:-app}" ;;
  copia-ahora)  copia_ahora ;;
  bajar-copia)  bajar_copia ;;
  *) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
