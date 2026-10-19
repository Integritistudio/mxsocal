# PostgreSQL Migration Guide

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. PostgreSQL Setup

Install PostgreSQL locally or use Heroku Postgres:

**Local Setup:**

```bash
# Install PostgreSQL (macOS)
brew install postgresql

# Start PostgreSQL
brew services start postgresql

# Create database
createdb ecommerce
```

**Heroku Setup:**

```bash
heroku addons:create heroku-postgresql:hobby-dev
heroku config
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Local PostgreSQL Example:**

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_NAME=ecommerce
```

**Heroku PostgreSQL Example:**
Get `DATABASE_URL` from heroku config:

```
DATABASE_URL=postgres://username:password@host:port/database
```

Then parse it:

```
DB_HOST=host
DB_PORT=port
DB_USER=username
DB_PASSWORD=password
DATABASE_NAME=database
```

### 4. Start Server

```bash
npm run dev
```

The server will automatically sync the database schema on startup (development mode).

## Key Changes from MongoDB

| MongoDB                   | Sequelize (PostgreSQL)                      |
| ------------------------- | ------------------------------------------- |
| `User.find()`             | `User.findAll()`                            |
| `User.findById()`         | `User.findByPk()`                           |
| `User.findOne({ email })` | `User.findOne({ where: { email } })`        |
| `new User().save()`       | `User.create()`                             |
| `user.updateOne()`        | `user.update()`                             |
| `user.deleteOne()`        | `user.destroy()`                            |
| `.select("-password")`    | `{ attributes: { exclude: ["password"] } }` |

## Models Overview

### User Model (`models/user.model.js`)

- UUID primary key
- Email unique constraint
- Password auto-hashed on create/update
- Timestamps (createdAt, updatedAt)
- `comparePassword()` method for auth
- `toJSON()` method excludes password

## Troubleshooting

**Connection Error:** Verify PostgreSQL is running and credentials are correct

```bash
psql -h localhost -U postgres -d ecommerce
```

**Port Already in Use:** Change `PORT` in `.env`

**Database Doesn't Exist:** Create it manually

```bash
createdb -U postgres ecommerce
```
