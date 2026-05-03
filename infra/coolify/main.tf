# Triggers Coolify deploy via HTTP API. Paths vary by Coolify version — verify in your instance API docs.

resource "null_resource" "coolify_deploy" {
  triggers = {
    redeploy = var.redeploy_trigger
  }

  provisioner "local-exec" {
    environment = {
      COOLIFY_TOKEN = var.coolify_token
    }
    interpreter = ["/bin/bash", "-c"]
    command = <<-EOT
set -euo pipefail
BASE='${var.coolify_api_base}'
UUID='${var.coolify_application_uuid}'
URL="$BASE/deploy?uuid=$UUID"
%{if var.deploy_force~}
URL="$URL&force=true"
%{endif~}
curl -fsS -X GET "$URL" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Accept: application/json"
EOT
  }
}
