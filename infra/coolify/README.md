# OpenTofu / Terraform — Coolify deploy hook

This stack is **Git + Dockerfile** on Coolify. IaC here only **triggers a deploy** (or you manage the full app in HCL with a third-party Coolify provider).

## Prereqs

1. In Coolify UI, create the application once (Git repo, Dockerfile, port **3000**, volume **`/app/data`**).
2. Copy the application **UUID** from Coolify (resource settings / API).
3. Create an **API token** (Coolify → Keys & Tokens).

## Configure

```bash
cd infra/coolify
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — never commit real tokens
```

Confirm the deploy URL for your Coolify version: many installs use a base like `https://<host>/api/v1` and a **`/deploy`** endpoint with `uuid` query or JSON body. Adjust `coolify_api_base` or the curl path in `main.tf` if your server returns 404.

## Run (OpenTofu)

```bash
tofu init
tofu plan
tofu apply
```

Change `redeploy_trigger` in `terraform.tfvars` between applies to force a new deploy.

## Run (Terraform CLI)

Same as above with `terraform` instead of `tofu`.

## Providers (alternative)

If you prefer full resource management, evaluate registry providers (e.g. search Terraform Registry for **coolify**) and pin a version; this repo does not vendor a provider binary.
