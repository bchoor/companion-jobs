# Cloudflare Infrastructure Setup Guide

## Phase 1 Status: ✅ Complete

The following have been automatically created:
- **D1 Database**: `companion-jobs` (ID: `2a789be5-eba3-4584-b59f-d8b0b99b4c4f`)
- **R2 Bucket**: `companion-store`
- **Database Schema**: Jobs, Runs, Results, Files tables initialized
- **wrangler.toml**: Configured with D1 and R2 bindings
- **.env.example**: Template for required environment variables

---

## Next Steps: Manual Configuration Required

### Step 1: Get Cloudflare Account ID and API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your profile icon → **My Profile**
3. Under "API Tokens":
   - Copy your **Account ID** (from the right side of "Account Overview")
   - Click **Create Token** → Use template "Edit Cloudflare Workers"
   - Grant permissions for D1 and R2
   - Copy the **API Token**

**What to save:**
```
CF_ACCOUNT_ID=<your account id>
CF_API_TOKEN=<your api token>
```

### Step 2: Create R2 API Tokens

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** (left sidebar)
2. Click **API Tokens** (in the right section)
3. Click **Create API Token** → Select "Object Lifecycle Management"
4. Grant access to: `companion-store` bucket
5. Copy the generated credentials:
   - **Access Key ID**
   - **Secret Access Key**
   - **S3 API Endpoint** (format: `https://your_account_id.r2.cloudflarestorage.com`)

**What to save:**
```
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret key>
R2_ENDPOINT=<s3 api endpoint>
```

### Step 3: Set Up Stack Auth

Stack Auth provides OAuth2 authentication (Google, GitHub, etc.).

1. Go to [Stack Auth Dashboard](https://app.stack-auth.com)
2. Sign up or log in with your GitHub account
3. Click **Create New Project** → Name it `companion-jobs`
4. In **Project Settings**:
   - Enable **Google OAuth** (or your preferred provider)
   - Add allowed origins:
     - `http://localhost:3000` (local development)
     - `https://your-production-domain.com` (when deploying)
5. Copy these values:
   - **Project ID**
   - **Publishable Client Key**
   - **Server Secret Key**

**What to save:**
```
VITE_STACK_PROJECT_ID=<project id>
VITE_STACK_PUBLISHABLE_CLIENT_KEY=<publishable key>
STACK_SERVER_SECRET_KEY=<server secret>
```

---

## Creating Your `.env` File

Once you have all the credentials from the steps above:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Replace all placeholder values with your actual credentials

3. **IMPORTANT**: Never commit `.env` to git — it's in `.gitignore`

---

## Verification

Once your `.env` is set up, verify connectivity:

```bash
# Test D1
bunx wrangler d1 execute companion-jobs --remote --command "SELECT COUNT(*) FROM jobs;"

# Test R2
bunx wrangler r2 bucket list
```

---

## Summary of Created Infrastructure

| Component | Name | ID/Endpoint |
|-----------|------|---|
| D1 Database | `companion-jobs` | `2a789be5-eba3-4584-b59f-d8b0b99b4c4f` |
| R2 Bucket | `companion-store` | See R2 API Token step |
| wrangler.toml | ✅ Configured | See project root |
| Schema | 4 tables (jobs, runs, results, files) | ✅ Applied to D1 |

Once you complete the manual steps and add credentials to `.env`, Phase 2 (data migration) can begin.
