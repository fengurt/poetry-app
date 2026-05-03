variable "coolify_api_base" {
  type        = string
  description = "Coolify API base URL, no trailing slash (e.g. https://coolify.example.com/api/v1)."
}

variable "coolify_application_uuid" {
  type        = string
  description = "Coolify application resource UUID (from UI or API)."
}

variable "coolify_token" {
  type        = string
  sensitive   = true
  description = "Coolify bearer API token."
}

variable "redeploy_trigger" {
  type        = string
  default     = "1"
  description = "Change this value to force a new deploy on the next apply."
}

variable "deploy_force" {
  type        = bool
  default     = false
  description = "If true, append force=true to the deploy request when supported."
}
