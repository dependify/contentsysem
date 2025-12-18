# ContentSys Deployment Guide for Coolify

## Prerequisites

1. **Coolify Instance**: Ensure you have Coolify installed and running
2. **Database**: PostgreSQL database (can be deployed via Coolify)
3. **Redis**: Redis instance (can be deployed via Coolify)
4. **Domain**: Optional domain name for your deployment

## Quick Deploy Steps

### 1. Deploy Database & Redis (if needed)

In Coolify, deploy these services first:

**PostgreSQL:**
- Service: PostgreSQL
- Database Name: `contentsys`
- Username: `postgres`
- Password: Generate a strong password

**Redis:**
- Service: Redis
- No additional configuration needed

### 2. Deploy ContentSys Application

1. **Create New Application** in Coolify
2. **Connect Repository**: 
   - Repository URL: Your Git repository URL
   - Branch: `main` (or your deployment branch)

3. **Configure Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgres://postgres:password@postgres-host:5432/contentsys
   REDIS_URL=redis://redis-host:6379/0
   MINIMAX_API_KEY=your_minimax_key
   OPENAI_API_KEY=your_openai_key
   TAVILY_API_KEY=your_tavily_key
   FIRECRAWL_API_KEY=your_firecrawl_key
   EXA_API_KEY=your_exa_key
   RUNWARE_API_KEY=your_runware_key
   JWT_SECRET=your_jwt_secret_32_chars_minimum
   SESSION_SECRET=your_session_secret_32_chars_minimum
   ```

4. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `3000`

5. **Deploy**: Click deploy and wait for the build to complete

### 3. Initialize Database

After deployment, initialize the database:

1. **Access Application Terminal** in Coolify
2. **Run Database Initialization**:
   ```bash
   npm run db:init
   ```

### 4. Verify Deployment

1. **Health Check**: Visit `https://your-domain.com/health`
2. **Application**: Visit `https://your-domain.com`
3. **API**: Visit `https://your-domain.com/api`

## Configuration Files

The following files are configured for Coolify deployment:

- `Dockerfile`: Multi-stage Docker build
- `docker-compose.yml`: Local development with Docker
- `coolify.json`: Coolify-specific configuration
- `.dockerignore`: Files to exclude from Docker build
- `.env.production`: Production environment template

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `MINIMAX_API_KEY` | MiniMax AI API key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `TAVILY_API_KEY` | Tavily search API key | Yes |
| `FIRECRAWL_API_KEY` | Firecrawl web scraping API key | Yes |
| `EXA_API_KEY` | Exa search API key | Yes |
| `RUNWARE_API_KEY` | Runware image generation API key | Yes |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes |
| `SESSION_SECRET` | Session signing secret (32+ chars) | Yes |
| `NODE_ENV` | Environment (production) | Yes |
| `PORT` | Application port (3000) | Yes |

## Scaling & Performance

### Resource Requirements
- **Memory**: 512MB minimum, 1GB recommended
- **CPU**: 0.5 cores minimum, 1 core recommended
- **Storage**: 1GB for application, additional for uploads

### Scaling Options
1. **Horizontal Scaling**: Deploy multiple instances behind a load balancer
2. **Database Scaling**: Use managed PostgreSQL with read replicas
3. **Redis Scaling**: Use Redis Cluster for high availability
4. **File Storage**: Consider object storage (S3, etc.) for uploads

## Monitoring

### Health Checks
- **Endpoint**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds

### Logs
- Application logs available in Coolify dashboard
- Database logs in PostgreSQL service
- Redis logs in Redis service

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure PostgreSQL is running
   - Verify network connectivity

2. **Redis Connection Failed**
   - Check REDIS_URL format
   - Ensure Redis is running
   - Verify network connectivity

3. **Build Failures**
   - Check Node.js version (requires 20+)
   - Verify all dependencies are installed
   - Check build logs for specific errors

4. **API Keys Invalid**
   - Verify all API keys are correct
   - Check API key permissions and quotas
   - Ensure keys are properly set in environment

### Support

For deployment issues:
1. Check Coolify logs
2. Verify environment variables
3. Test database and Redis connectivity
4. Review application health endpoint

## Security Considerations

1. **Environment Variables**: Never commit API keys to repository
2. **Database**: Use strong passwords and restrict access
3. **HTTPS**: Always use HTTPS in production
4. **Secrets**: Generate strong JWT and session secrets
5. **Updates**: Keep dependencies updated regularly

## Backup Strategy

1. **Database**: Regular PostgreSQL backups
2. **Uploads**: Backup uploads directory or use object storage
3. **Configuration**: Backup environment variables and settings
4. **Code**: Ensure code is in version control

This deployment guide ensures a secure, scalable deployment of ContentSys on Coolify.