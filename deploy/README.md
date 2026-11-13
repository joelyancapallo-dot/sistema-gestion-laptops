# Despliegue del sistema de laptops en el VPS

El sistema corre en el VPS de Khipu Quantum (`2.25.225.198`), en **k3s**, junto
a Muyu y los otros proyectos, en su propio espacio (`sislaptop`). Todo se
maneja **desde tu PC con Git Bash** con un solo script, `deploy/sislaptop.sh`,
que habla con el VPS por SSH (el alias `muyu` de `~/.ssh/config`, el mismo de
Muyu).

| Dirección | Qué es |
|---|---|
| `https://sislaptop.khipuquantum.com` | El sistema (la web y su servidor) |
| `registry.khipuquantum.com/sislaptop/sislaptop` | Sus imágenes en Harbor |

> **Desde PowerShell no escribas solo `bash`**: puede abrir el bash de WSL
> (`execvpe(/bin/bash) failed`). Llama a Git Bash por su ruta:
>
> ```powershell
> & "C:\Program Files\Git\bin\bash.exe" deploy/sislaptop.sh estado
> ```

```
deploy/
├── k8s/sislaptop.yaml   todo lo que corre en el VPS
├── sislaptop.sh         secretos, publicar, volver, copias…
└── secretos/            sislaptop.env (lo crea el script; NO va a git)
```

## Cómo está armado

**Un solo pod** con dos contenedores:

- **app**: el servidor Node/Express, que sirve la API y la web ya compilada
  por el puerto 5000. Es una sola imagen (`Dockerfile` en la raíz): primero
  compila la web con Vite y luego la copia junto al servidor.
- **postgres**: PostgreSQL 16, solo para este pod. La app se conecta por
  `127.0.0.1`. Arranca antes que la app y se apaga después de ella.

Tres discos: la base (`sislaptop-base`), las fotos (`sislaptop-fotos`) y las
copias (`sislaptop-copias`). Desde internet solo se llega a la app, a través
de Traefik, con HTTPS de Let's Encrypt (cert-manager). La base no es
alcanzable ni desde internet ni desde los otros proyectos del VPS.

> **Cuidado:** en este VPS, borrar un disco (PVC) o el espacio `sislaptop`
> **borra los datos para siempre**. Por eso existen las copias diarias.

Cada publicación reinicia el pod entero (app y base): son unos segundos sin
servicio.

> **CPU del VPS:** los proyectos ya reservan casi los 4 núcleos (99 % de
> `requests`), aunque usan alrededor del 15 %. Por eso el pod reserva lo mínimo
> (10m por contenedor). Si un pod se queda en `Pending` con «Insufficient cpu»,
> es esto: hay que bajar reservas sobredimensionadas de otros proyectos.
>
> Si `ssh muyu` da «Connection timed out», es la red (a veces la wifi no deja
> llegar al VPS): reintenta o usa los datos del celular.

---

## Primera instalación

1. **DNS** (hecho): registro A `sislaptop` → `2.25.225.198`.
2. **Harbor** (hecho): proyecto `sislaptop`. Comprueba dos cosas:
   - Esta PC tiene sesión: `docker login registry.khipuquantum.com`.
   - El acceso con que el VPS baja las imágenes (`harbor-pull`, el mismo de
     los otros proyectos) es **miembro del proyecto `sislaptop`**. Si no, el
     pod se queda en `ImagePullBackOff`.
3. **El código**: las carpetas `server/` y `client/` tienen que estar en este
   repositorio. Sin ellas no hay imagen que construir.
4. **Secretos**:

   ```bash
   bash deploy/sislaptop.sh secretos
   ```

   Crea `deploy/secretos/sislaptop.env` con claves al azar (`DB_PASSWORD`,
   `JWT_SECRET`), las carga en el VPS y copia el acceso a Harbor.
   **Guarda una copia de ese archivo fuera de esta PC.**
5. **Primera publicación**:

   ```bash
   bash deploy/sislaptop.sh publicar 1.0.0
   ```

   Las tablas y el administrador se crean solos: el servidor ejecuta
   `initDb()` en cada arranque, que solo crea lo que falta y no borra nada
   (`iniciar-base` hace lo mismo a mano; no hace falta).
6. Entra a `https://sislaptop.khipuquantum.com` con el administrador por
   defecto y **cambia su contraseña en seguida**: el README del repositorio
   (que es público) la publica.

---

## Día a día

| Quiero… | Comando |
|---|---|
| Publicar una versión nueva | `bash deploy/sislaptop.sh publicar 1.0.1` |
| Volver a una versión anterior | `bash deploy/sislaptop.sh volver 1.0.0` |
| Ver el pod, los discos y el certificado | `bash deploy/sislaptop.sh estado` |
| Ver el registro de la app | `bash deploy/sislaptop.sh registro` |
| Ver el registro de la base | `bash deploy/sislaptop.sh registro postgres` |
| Hacer una copia ya | `bash deploy/sislaptop.sh copia-ahora` |
| Bajar la última copia a la PC | `bash deploy/sislaptop.sh bajar-copia` |

`publicar` construye la imagen, la sube a Harbor, cambia la versión en
`deploy/k8s/sislaptop.yaml`, la aplica en el VPS y, si el pod queda listo,
guarda ese cambio en git con la etiqueta `sislaptop-v<versión>`. Al terminar:
`git push --follow-tags`.

Si cambias `JWT_SECRET` en `sislaptop.env`, todos tienen que volver a iniciar
sesión. **No cambies `DB_PASSWORD`**: la base ya la tiene guardada por dentro y
la app dejaría de entrar. El script se niega a hacerlo salvo con
`CAMBIAR_LLAVES=si`.

---

## Copias

Cada noche a las 3:30 a. m. (hora de Lima) una tarea del VPS guarda en el
disco `sislaptop-copias`:

- `base-AAAA-MM-DD-HHMM.dump`: la base entera, comprobada (se guardan 14 días);
- `fotos.tar.gz`: todas las fotos (solo la última).

Ese disco está en el mismo VPS: si el VPS se pierde, se pierden también. Por
eso hay que **bajarlas a la PC** con `bajar-copia`, que las deja en
`copias-sislaptop/` (se guardan 30; la carpeta no va a git). Conviene
programarlo en Windows como tarea diaria, igual que «Muyu - bajar copia».

### Restaurar una copia

```bash
# La base (borra lo que haya y carga la copia)
ssh muyu 'KUBECONFIG=~/.kube/config kubectl -n sislaptop exec -i deploy/sislaptop -c postgres -- pg_restore -U sislaptop -d tienda_laptops --clean --if-exists' < copias-sislaptop/base-AAAA-MM-DD-HHMM.dump
# Las fotos
ssh muyu 'KUBECONFIG=~/.kube/config kubectl -n sislaptop exec -i deploy/sislaptop -c app -- tar -C /app/server/uploads/laptops -xzf -' < copias-sislaptop/fotos-AAAA-MM-DD-HHMM.tar.gz
```

---

## Notas sobre el código

- El pod comprueba `GET /api/health`, que solo responde cuando `initDb()` ya
  terminó (la base está lista).
- `server/cleanDatabase.js` (`npm run clean-db`) borra todas las ventas y
  laptops: **no entra en la imagen** (`.dockerignore`).
- El servidor solo escribe en `server/uploads/laptops` (el disco de fotos).
  El resto del contenedor es de solo lectura: si algún día escribe en otra
  carpeta fallará con `EROFS` y habrá que darle un disco.
- Pendiente: que la contraseña inicial del administrador salga de una
  variable en vez de `admin123` (hoy hay que cambiarla a mano al entrar).
