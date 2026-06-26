# IMMS Web Application - Deployment Guide

## Project Overview
IMMS (Industrial Maintenance Management System) is a complete web application for maintenance management. All modifications have been completed and the app is ready for deployment.

## Completed Modifications
✅ All 7 modification tasks have been completed:
1. Updated contacts.html SVG (contact.svg)
2. Updated signup.html SVG (signup.svg)
3. Fixed change-password.html SVG and verified Supabase auth
4. Fixed addMachine.html and JS (Supabase integration, image upload, auto-redirect)
5. Fixed addMember.html and JS (Supabase integration, multi-select production lines, auto-redirect)
6. Fixed ajouterChaine.html and JS (Supabase integration, color-coded status, auto-redirect)
7. Fixed ajouterUsine.html and JS (Supabase integration, drag-drop image upload, auto-redirect)

## Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL Database + Authentication + Storage)
- **Hosting Options**: Vercel, Netlify, GitHub Pages, or any static hosting

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)
1. Push your project to GitHub
2. Go to vercel.com and sign in
3. Click "New Project" and select your GitHub repository
4. Vercel will auto-detect it as a static site
5. Set environment variables if needed (Supabase credentials are already in the code)
6. Click "Deploy"

### Option 2: Deploy to Netlify
1. Push your project to GitHub
2. Go to netlify.com and sign in
3. Click "Add new site" → "Connect to Git"
4. Select your GitHub repository
5. Build settings: Leave as default (static site)
6. Click "Deploy site"

### Option 3: Deploy to GitHub Pages
1. Push your project to GitHub
2. Go to repository Settings → Pages
3. Select "Deploy from a branch"
4. Choose your branch and root folder
5. Click "Save"
6. Your site will be available at: https://yourusername.github.io/repositoryname

### Option 4: Deploy to a Web Server
1. Upload all files to your web server via FTP/SFTP
2. Ensure all file paths are correct
3. The app will work with Supabase credentials already in place

## Important Notes
- The Supabase credentials are embedded in the JavaScript files (SUPABASE_URL and SUPABASE_KEY)
- For production, consider moving these to environment variables
- Ensure your Supabase database has the following tables:
  - usines
  - chaines
  - machines
  - members
  - interventions
  - etc.
- Images are stored in Supabase Storage (bucket: "images")
- The app uses Supabase Authentication for user management

## File Structure
- HTML files: Main pages and forms
- JavaScript files: Business logic and Supabase integration
- CSS file: style.css contains all styling
- SVG files: Graphics and illustrations
- image001.png: Logo

## Testing Before Deployment
1. Test all CRUD operations for usines, chaines, machines, members
2. Test authentication (login, signup, forgot password, change password)
3. Test image uploads
4. Test form validations
5. Test redirects after operations
6. Verify Supabase connection

## Post-Deployment
1. Update the base URL in forgot-password.js if needed
2. Monitor Supabase logs for errors
3. Set up proper CORS headers in Supabase
4. Consider adding SSL certificate
5. Set up backups for database

## Support
For Supabase documentation: https://supabase.com/docs
For deployment help: Contact your hosting provider
