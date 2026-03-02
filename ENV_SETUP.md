# Environment Variables Setup Guide

## 🚀 Quick Setup

### 1. Copy the environment file

```bash
cp .env.example .env
```

### 2. Required Environment Variables for Auth Module

#### **Database**

```bash
# MongoDB connection (required)
MONGODB_URI=mongodb://localhost:27017/triply
```

#### **JWT Authentication**

```bash
# Generate strong secrets for production
JWT_SECRET=your-super-secret-jwt-access-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production

# Token expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### **Google OAuth**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

#### **Email Configuration**

For Gmail (recommended for development):

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in MAIL_PASS

```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@triply.com
MAIL_FROM_NAME=Triply
```

#### **Encryption Key**

Generate a 32-byte hex key:

```bash
openssl rand -hex 32
```

```bash
ENCRYPTION_KEY=your-32-byte-encryption-key-hex-format
```

#### **Security Settings**

```bash
# OTP configuration
OTP_EXPIRY_MINUTES=10
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=30
```

## 🔧 Development Setup

### Install Dependencies

```bash
npm install @casl/ability @nestjs-modules/mailer passport-jwt passport-google-oauth20 otplib @nestjs/passport @nestjs/throttler @nestjs/event-emitter
```

### Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or install locally
brew install mongodb-community
brew services start mongodb-community
```

### Generate Encryption Key

```bash
openssl rand -hex 32
# Copy the output to ENCRYPTION_KEY in your .env file
```

## 📧 Email Service Testing

For development, you can use Mailtrap or Ethereal Email:

```bash
# Mailtrap (recommended for testing)
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your-mailtrap-user
MAIL_PASS=your-mailtrap-pass
```

## 🔐 Security Best Practices

### Production Environment

1. **Use strong, unique secrets** for JWT tokens
2. **Rotate secrets regularly**
3. **Use environment-specific configurations**
4. **Enable HTTPS in production**
5. **Use production email service** (SendGrid, AWS SES, etc.)
6. **Set up proper CORS origins**
7. **Enable audit logging**

### Environment-Specific Examples

#### **Development (.env.development)**

```bash
NODE_ENV=development
APP_MODE=sandbox
DEV_DISABLE_EMAIL=false
DEV_OTP_BYPASS=false
```

#### **Production (.env.production)**

```bash
NODE_ENV=production
APP_MODE=live
LOG_LEVEL=warn
LOG_ENABLE_JSON=true
CORS_ORIGINS=https://yourdomain.com
```

## 🚨 Common Issues

### **Google OAuth Not Working**

- Verify callback URL matches in Google Console
- Check that OAuth consent screen is configured
- Ensure proper redirect URI is set

### **Email Not Sending**

- Check SMTP credentials
- Verify 2FA is enabled and App Password is used for Gmail
- Test with Mailtrap for development

### **MongoDB Connection Issues**

- Verify MongoDB is running
- Check connection string format
- Ensure proper network access

## 📋 Environment Variables Checklist

- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - Strong secret for access tokens
- [ ] `JWT_REFRESH_SECRET` - Strong secret for refresh tokens
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- [ ] `MAIL_HOST` - SMTP server host
- [ ] `MAIL_USER` - SMTP username
- [ ] `MAIL_PASS` - SMTP password
- [ ] `ENCRYPTION_KEY` - 32-byte hex encryption key
- [ ] `CORS_ORIGINS` - Allowed frontend origins

Once these are configured, your auth module will be fully functional! 🎉
