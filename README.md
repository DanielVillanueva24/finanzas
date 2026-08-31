# Finanzas Personales

Aplicacion web (PWA) para llevar ingresos, gastos, presupuestos y reportes personales.
Se instala en el iPhone desde Safari como si fuera una app nativa y se ve igual en Mac o PC.

**Stack:** React 18 + TypeScript + Vite + Tailwind + Recharts en el front, FastAPI + SQLAlchemy +
SQLite en el back, autenticacion con JWT.

---

## Que trae

- **Dashboard**: balance del mes, tarjetas de ingresos/gastos/saldo, barras de ingresos vs gastos
  de los ultimos 6 meses, dona de gastos por categoria y los ultimos 5 movimientos.
- **Transacciones**: alta, edicion y borrado, con busqueda por texto y filtros por tipo,
  categoria y rango de fechas, mas paginacion.
- **Categorias**: 9 de gasto y 5 de ingreso ya cargadas, y CRUD completo para las tuyas
  (nombre, emoji y color).
- **Presupuestos**: limite mensual por categoria, barra de avance y aviso visual al 80% y al 100%.
  Se renuevan solos cada mes.
- **Reportes**: resumen por semana, mes o ano, tabla de totales por categoria, linea de saldo
  acumulado y exportacion a CSV.
- **PWA**: manifest, iconos, service worker y pantalla de "sin conexion".

Cuenta de prueba (se crea sola la primera vez que arranca el backend):

```
usuario:    demo
contrasena: demo1234
```

Trae 36 movimientos de los ultimos 3 meses, las categorias predefinidas y 5 presupuestos.

---

## Estructura

```
finanzas/
├── backend/
│   ├── main.py              # app FastAPI, CORS y arranque
│   ├── config.py            # settings desde .env
│   ├── database.py          # engine y sesion de SQLAlchemy
│   ├── models.py            # User, Category, Transaction, Budget
│   ├── schemas.py           # esquemas Pydantic
│   ├── auth.py              # hash de contrasenas y JWT
│   ├── defaults.py          # categorias predefinidas
│   ├── seed.py              # datos de prueba
│   ├── routers/             # auth, transactions, categories, budgets, reports
│   ├── alembic/             # migraciones
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # cliente axios y endpoints
│   │   ├── components/      # layout, formularios, graficas, UI
│   │   ├── hooks/           # auth, toasts, mes activo, categorias
│   │   ├── pages/           # Login, Dashboard, Transacciones, ...
│   │   └── types/
│   ├── public/              # manifest.json, sw.js, iconos
│   ├── scripts/             # generador de iconos PNG
│   └── package.json
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## 1. Clonar el repositorio

```bash
git clone <url-del-repo> finanzas
cd finanzas
```

## 2. Backend

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## 3. Frontend

```bash
cd ../frontend
npm install
```

## 4. Variables de entorno

```bash
# backend
cp backend/.env.example backend/.env

# frontend
cp frontend/.env.example frontend/.env
```

En `backend/.env` lo unico importante para produccion es cambiar `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

| Variable | Donde | Para que |
|---|---|---|
| `DATABASE_URL` | backend | Por defecto `sqlite:///./finanzas.db` |
| `SECRET_KEY` | backend | Firma de los JWT. Cambiala si publicas la app |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | Duracion de la sesion (7 dias por defecto) |
| `CORS_ORIGINS` | backend | Origenes permitidos, separados por coma |
| `SEED_DEMO_DATA` | backend | `true` crea el usuario demo al arrancar |
| `VITE_API_URL` | frontend | URL del backend |

## 5. Ejecutar el backend

```bash
cd backend
uvicorn main:app --reload
```

Queda en <http://localhost:8000> y la documentacion interactiva en <http://localhost:8000/docs>.
Las tablas se crean solas en el primer arranque.

## 6. Ejecutar el frontend

```bash
cd frontend
npm run dev
```

Abre <http://localhost:5173> y entra con `demo` / `demo1234`.

### Migraciones (opcional)

El esquema se crea solo al arrancar. Si prefieres manejarlo con Alembic:

```bash
cd backend
alembic upgrade head                       # aplicar migraciones
alembic revision --autogenerate -m "cambio"  # crear una nueva
```

### Regenerar los iconos de la PWA

```bash
cd frontend
python scripts/generate_icons.py
```

---

## 7. Desplegar en Render.com (plan gratis)

El repositorio incluye `render.yaml`, asi que puedes usar **New > Blueprint** y apuntarlo a tu
repo, o crear los dos servicios a mano:

### Backend (Web Service)

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Variables de entorno:

- `SECRET_KEY`: genera una nueva, no reutilices la del ejemplo.
- `CORS_ORIGINS`: la URL de tu frontend, por ejemplo `https://finanzas-web.onrender.com`.
- `SEED_DEMO_DATA`: `false` si no quieres el usuario demo.

### Frontend (Static Site)

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Variables de entorno:

- `VITE_API_URL`: la URL del backend, por ejemplo `https://finanzas-api.onrender.com`.

Y agrega una **Redirect/Rewrite Rule**: origen `/*`, destino `/index.html`, tipo `Rewrite`.
Sin esa regla, recargar en `/transacciones` da 404.

### Aviso importante sobre SQLite en el plan gratis

El disco de los servicios gratuitos de Render es efimero: **cada redeploy o reinicio borra el
archivo `finanzas.db`**. Para uso real tienes dos caminos:

1. **Postgres gratis de Render** (recomendado): crea la base, agrega `psycopg2-binary` a
   `backend/requirements.txt` y pon la Internal Database URL en `DATABASE_URL`. El codigo no
   cambia, SQLAlchemy se encarga.
2. **Disco persistente**: requiere plan de pago; montalo y apunta `DATABASE_URL` a esa ruta.

Ademas, el plan gratis duerme el servicio tras unos minutos sin trafico: la primera carga
despues de dormir tarda ~30 segundos.

---

## 8. Instalar la PWA en el iPhone

> Safari es el unico navegador de iOS que permite instalar apps en la pantalla de inicio.
> Chrome o Firefox en iPhone no muestran la opcion.

1. Abre **Safari** en el iPhone.
2. Entra a la URL de la app (la de Render, o la de tu PC si estas en la misma WiFi).
3. Inicia sesion una vez, para que la app quede lista.
4. Toca el boton **Compartir** (el cuadrito con la flecha hacia arriba, abajo al centro).
5. Desliza hacia abajo y elige **Agregar a inicio**.
6. Cambia el nombre si quieres (viene como "Finanzas") y toca **Agregar**.
7. Listo: el icono queda en la pantalla de inicio y abre a pantalla completa, sin barra de
   Safari, con la barra de estado en el color de la app.

Notas:

- El modo instalable solo funciona sobre **HTTPS** (Render ya lo da) o en `localhost`.
- El service worker solo se registra en la build de produccion. Para probarlo en tu maquina:
  `npm run build && npm run preview`.
- Si actualizas la app y el iPhone sigue mostrando la version vieja, cierra la app desde el
  multitarea y vuelve a abrirla.

### Probarla desde el iPhone sin desplegar nada

Con el celular y la computadora en la **misma red WiFi**:

1. Busca la IP local de tu computadora:
   - Windows: `ipconfig` -> "Direccion IPv4", algo como `192.168.1.42`
   - macOS: `ipconfig getifaddr en0`
2. En `frontend/.env` pon esa IP: `VITE_API_URL=http://192.168.1.42:8000`
3. Levanta los dos servicios escuchando en la red:

```bash
# terminal 1
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000

# terminal 2
cd frontend && npm run dev:lan
```

4. En el iPhone abre `http://192.168.1.42:5173`.

El backend ya acepta por CORS cualquier origen `192.168.x.x`, asi que no hay que tocar nada mas.
Sobre HTTP la app se ve completa pero **no se puede instalar**: para eso necesitas HTTPS.

---

## API

Todos los endpoints menos `/auth/register` y `/auth/login` piden el header
`Authorization: Bearer <token>`.

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/auth/register` | Crear cuenta (devuelve token y crea las categorias base) |
| POST | `/auth/login` | Iniciar sesion |
| GET | `/auth/me` | Perfil del usuario del token |
| GET | `/transactions` | Lista con `page`, `limit`, `type`, `category_id`, `start_date`, `end_date`, `search` |
| POST | `/transactions` | Crear |
| PUT | `/transactions/{id}` | Editar |
| DELETE | `/transactions/{id}` | Eliminar |
| GET | `/categories` | Lista (filtro opcional `type`) |
| POST | `/categories` | Crear |
| PUT | `/categories/{id}` | Editar |
| DELETE | `/categories/{id}` | Eliminar (sus transacciones quedan sin categoria) |
| GET | `/budgets` | Presupuestos de `year` y `month`, con gastado y porcentaje |
| POST | `/budgets` | Crear |
| PUT | `/budgets/{id}` | Editar |
| DELETE | `/budgets/{id}` | Eliminar |
| GET | `/reports/summary` | Totales por `period` (`week`/`month`/`year`) o `start`/`end` |
| GET | `/reports/by-category` | Totales por categoria |
| GET | `/reports/balance-history` | Ingresos, gastos y saldo acumulado por mes (`months`) |
| GET | `/reports/export-csv` | Descarga CSV del rango |

---

## Docker (opcional)

```bash
docker compose up --build
```

Levanta el backend en <http://localhost:8000> y el frontend en <http://localhost:5173>.

---

## Detalles de implementacion

- **Presupuestos recurrentes**: al consultar un mes sin presupuestos, el backend copia los del
  ultimo mes que si tenga y esten marcados como recurrentes.
- **Transferencias**: no suman a ingresos ni a gastos, solo quedan registradas.
- **Colores de categoria**: la paleta por defecto esta validada para daltonismo, los colores
  vecinos se distinguen en deuteranopia, protanopia y tritanopia.
- **Seguridad**: contrasenas con bcrypt, tokens JWT firmados con `SECRET_KEY` y cada consulta
  filtrada por el usuario del token.
