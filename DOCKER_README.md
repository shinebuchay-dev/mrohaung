# 🐳 Docker Setup Guide

This guide will help you run the entire application stack using Docker.

## 📋 Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)
- At least **4GB RAM** allocated to Docker

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template and customize it:

```bash
cp .env.docker .env
```

Edit `.env` and update the values (especially passwords and secrets).

### 2. Start All Services

```bash
docker-compose up -d
```

This will start:
- **MySQL Database** (port 3306)
- **Backend API** (port 5000)
- **Frontend** (port 3000)
- **Nginx Reverse Proxy** (port 80)

### 3. Access the Application

- **Application**: http://localhost
- **Frontend Only**: http://localhost:3000
- **Backend API**: http://localhost/api or http://localhost:5000/api
- **MySQL**: localhost:3306

## 📦 Docker Commands

### Start Services
```bash
# Start all services in detached mode
docker-compose up -d

# Start and view logs
docker-compose up

# Start specific service
docker-compose up -d frontend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
docker-compose logs -f nginx
```

### Rebuild Services
```bash
# Rebuild all services
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build frontend
```

### Execute Commands in Containers
```bash
# Access backend shell
docker-compose exec backend sh

# Access database
docker-compose exec db mysql -u user -p social_media

# Run migrations (if using Prisma)
docker-compose exec backend npx prisma migrate deploy
```

## 🔧 Troubleshooting

### Port Already in Use
If you get "port already allocated" errors:

```bash
# Check what's using the port
netstat -ano | findstr :80
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Issues
```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend Build Errors
```bash
# Rebuild with no cache
docker-compose build --no-cache frontend

# Check frontend logs
docker-compose logs frontend
```

### Clear Everything and Start Fresh
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## 📊 Database Management

### Backup Database
```bash
docker-compose exec db mysqldump -u user -ppassword123 social_media > backup.sql
```

### Restore Database
```bash
docker-compose exec -T db mysql -u user -ppassword123 social_media < backup.sql
```

### Access MySQL CLI
```bash
docker-compose exec db mysql -u user -ppassword123 social_media
```

## 🔐 Production Deployment

### Security Checklist
- [ ] Change all default passwords in `.env`
- [ ] Use strong `JWT_SECRET`
- [ ] Enable HTTPS with SSL certificates
- [ ] Update `NEXT_PUBLIC_API_URL` to your domain
- [ ] Set `NODE_ENV=production`
- [ ] Review and restrict CORS settings
- [ ] Enable firewall rules
- [ ] Regular database backups

### SSL/HTTPS Setup
1. Obtain SSL certificates (Let's Encrypt, etc.)
2. Place certificates in `./nginx/ssl/`
3. Uncomment SSL configuration in `nginx/default.conf`
4. Update `docker-compose.yml` to mount SSL volume
5. Restart nginx: `docker-compose restart nginx`

## 📈 Monitoring

### Check Service Health
```bash
# Check all services status
docker-compose ps

# Check resource usage
docker stats
```

### Health Check Endpoints
- **Nginx**: http://localhost/health
- **Backend**: http://localhost:5000/api/health (if implemented)

## 🛠️ Development vs Production

### Development Mode
```bash
# Use docker-compose.dev.yml for development
docker-compose -f docker-compose.dev.yml up
```

### Production Mode
```bash
# Use default docker-compose.yml
docker-compose up -d
```

## 📝 Notes

- **Data Persistence**: Database data is stored in Docker volumes (`db_data`)
- **Uploads**: Backend uploads are stored in `backend_uploads` volume
- **Networking**: All services communicate via `app-network` bridge
- **Logs**: Nginx logs are available in the nginx container

## 🆘 Getting Help

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure Docker Desktop has enough resources
4. Try rebuilding: `docker-compose up -d --build`

## 🎯 Next Steps

- [ ] Customize environment variables
- [ ] Set up SSL certificates for production
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Review security settings
