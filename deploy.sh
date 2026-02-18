#!/usr/bin/env bash
# ============================================================
#
#  Space Card Shop — One-Click VPS Deployment Script
#  Tested on: Ubuntu 20.04 / 22.04 / 24.04
#
#  Usage (on a fresh VPS):
#    curl -fsSL https://raw.githubusercontent.com/YOUR_USER/space-card-shop/main/deploy.sh | bash
#  Or:
#    chmod +x deploy.sh && sudo ./deploy.sh
#
# ============================================================

set -euo pipefail

# ======================== Constants ========================

readonly SCRIPT_VERSION="3.0"
readonly DEFAULT_APP_DIR="/opt/space-card-shop"
readonly LOG_FILE="/var/log/space-card-shop-deploy.log"

# ======================== Colors ===========================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ======================== Logging ==========================

# Every message is also appended to the log file for debugging.
log()   { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE" 2>/dev/null || true; }
info()  { echo -e "  ${CYAN}[INFO]${NC}  $*";  log "INFO  $*"; }
ok()    { echo -e "  ${GREEN}[ OK ]${NC}  $*";  log "OK    $*"; }
warn()  { echo -e "  ${YELLOW}[WARN]${NC}  $*"; log "WARN  $*"; }
err()   { echo -e "  ${RED}[FAIL]${NC}  $*";    log "ERROR $*"; }
step()  { echo -e "\n  ${BOLD}── $* ──${NC}\n"; log "STEP  $*"; }
divider() { echo -e "  ${DIM}────────────────────────────────────────────${NC}"; }

# ======================== Error trap =======================

# If any command fails, print a helpful message with the line number.
trap 'on_error $LINENO' ERR

on_error() {
    local line=$1
    err "Command failed at line $line. Check $LOG_FILE for details."
    err "You can re-run this script safely — it picks up where it left off."
    exit 1
}

# ======================== Root check =======================

check_root() {
    if [ "$EUID" -ne 0 ]; then
        err "This script must be run as root (use: sudo ./deploy.sh)"
        exit 1
    fi
}

# ======================== Banner ===========================

show_banner() {
    echo ""
    echo -e "  ${CYAN}╔════════════════════════════════════════════╗${NC}"
    echo -e "  ${CYAN}║                                            ║${NC}"
    echo -e "  ${CYAN}║${NC}   ${BOLD}Space Card Shop — Deploy Manager v${SCRIPT_VERSION}${NC}   ${CYAN}║${NC}"
    echo -e "  ${CYAN}║                                            ║${NC}"
    echo -e "  ${CYAN}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

# ==========================================================
#  PHASE 1: System Prerequisites
#  Update apt, install git, curl, openssl
# ==========================================================

install_prerequisites() {
    step "Phase 1/6 · System Prerequisites"

    info "Updating package lists..."
    apt-get update -qq >> "$LOG_FILE" 2>&1

    local pkgs=(git curl openssl wget ca-certificates gnupg lsb-release)
    local to_install=()

    for pkg in "${pkgs[@]}"; do
        if ! dpkg -l "$pkg" &>/dev/null; then
            to_install+=("$pkg")
        fi
    done

    if [ ${#to_install[@]} -gt 0 ]; then
        info "Installing: ${to_install[*]}"
        apt-get install -y -qq "${to_install[@]}" >> "$LOG_FILE" 2>&1
        ok "System packages installed"
    else
        ok "All system packages already present"
    fi

    # Show versions
    info "git $(git --version 2>/dev/null | awk '{print $3}')"
    info "curl $(curl --version 2>/dev/null | head -1 | awk '{print $2}')"
}

# ==========================================================
#  PHASE 2: Install Docker & Docker Compose
# ==========================================================

install_docker() {
    step "Phase 2/6 · Docker Engine & Compose"

    # --- Docker Engine ---
    if command -v docker &>/dev/null; then
        ok "Docker already installed: $(docker --version | awk '{print $3}' | tr -d ',')"
    else
        info "Installing Docker via official installer..."
        curl -fsSL https://get.docker.com | bash >> "$LOG_FILE" 2>&1
        systemctl enable docker >> "$LOG_FILE" 2>&1
        systemctl start docker
        ok "Docker installed: $(docker --version | awk '{print $3}' | tr -d ',')"
    fi

    # --- Docker Compose (plugin) ---
    if docker compose version &>/dev/null; then
        ok "Docker Compose: $(docker compose version --short 2>/dev/null)"
    else
        info "Installing Docker Compose plugin..."
        apt-get install -y -qq docker-compose-plugin >> "$LOG_FILE" 2>&1
        ok "Docker Compose: $(docker compose version --short 2>/dev/null)"
    fi

    # Make sure daemon is running
    if ! systemctl is-active --quiet docker; then
        systemctl start docker
    fi

    # Add sudo user to docker group (if applicable)
    if [ -n "${SUDO_USER:-}" ]; then
        usermod -aG docker "$SUDO_USER" 2>/dev/null || true
        info "Added user '$SUDO_USER' to docker group (re-login to take effect)"
    fi
}

# ==========================================================
#  PHASE 3: Clone or Pull Source Code
# ==========================================================

clone_or_pull() {
    step "Phase 3/6 · Source Code"

    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"

    # Check if we're already inside the project directory
    if [ -f "./docker-compose.yml" ] && [ -f "./Dockerfile" ]; then
        app_dir="$(pwd)"
        info "Running from existing project directory: $app_dir"
        APP_DIR="$app_dir"

        # Try pulling latest if it's a git repo
        if [ -d ".git" ]; then
            info "Pulling latest changes..."
            git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || warn "git pull skipped (no remote or not on main/master)"
            ok "Code updated"
        fi
        return 0
    fi

    # Ask for GitHub repo URL
    echo ""
    echo -e "  ${YELLOW}Enter your GitHub repository URL${NC}"
    echo -e "  ${DIM}Example: https://github.com/username/space-card-shop.git${NC}"
    echo ""
    read -rp "  Repository URL: " REPO_URL

    if [ -z "$REPO_URL" ]; then
        err "Repository URL cannot be empty"
        exit 1
    fi

    # Derive directory name from repo URL
    local repo_name
    repo_name=$(basename "$REPO_URL" .git)
    app_dir="/opt/$repo_name"

    echo ""
    echo -e "  ${DIM}Install directory: $app_dir${NC}"
    read -rp "  Change path? (Enter to accept, or type new path): " custom_path
    if [ -n "$custom_path" ]; then
        app_dir="$custom_path"
    fi

    APP_DIR="$app_dir"

    if [ -d "$app_dir/.git" ]; then
        # Directory exists and is a git repo → pull
        info "Directory exists. Pulling latest code..."
        cd "$app_dir"
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
        ok "Code updated in $app_dir"
    elif [ -d "$app_dir" ] && [ ! -d "$app_dir/.git" ]; then
        # Directory exists but not a git repo → backup and clone
        warn "Directory $app_dir exists but is not a git repo"
        local backup="${app_dir}.bak.$(date +%s)"
        mv "$app_dir" "$backup"
        info "Backed up to $backup"

        info "Cloning $REPO_URL ..."
        git clone "$REPO_URL" "$app_dir" >> "$LOG_FILE" 2>&1
        cd "$app_dir"
        ok "Code cloned into $app_dir"
    else
        # Fresh clone
        info "Cloning $REPO_URL ..."
        git clone "$REPO_URL" "$app_dir" >> "$LOG_FILE" 2>&1
        cd "$app_dir"
        ok "Code cloned into $app_dir"
    fi
}

# ==========================================================
#  PHASE 4: Environment Configuration
#  Check .env, prompt user if missing, auto-generate secrets
# ==========================================================

setup_environment() {
    step "Phase 4/6 · Environment Configuration"

    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    # ---- Domain ----
    echo ""
    echo -e "  ${YELLOW}Enter your domain name${NC}"
    echo -e "  ${DIM}Example: shop.example.com   (without https://)${NC}"
    echo ""
    read -rp "  Domain: " DOMAIN

    if [ -z "$DOMAIN" ]; then
        err "Domain cannot be empty"
        exit 1
    fi
    # Strip protocol if user included it
    DOMAIN=$(echo "$DOMAIN" | sed 's|https\?://||' | sed 's|/||g')
    ok "Domain: $DOMAIN"

    # ---- Email for SSL ----
    echo ""
    read -rp "  Email (for SSL certificate notifications): " SSL_EMAIL
    if [ -z "$SSL_EMAIL" ]; then
        warn "No email provided; SSL notifications will be disabled"
        SSL_EMAIL=""
    fi

    # ---- Generate .env ----
    if [ -f .env ]; then
        info ".env file already exists"
        read -rp "  Overwrite with fresh config? (y/N): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            # Just update domain
            sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" .env
            ok "Updated domain in existing .env"
            return 0
        fi
    fi

    # Auto-generate strong random passwords
    local db_root_pw db_pw jwt_secret
    db_root_pw=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    db_pw=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    jwt_secret=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

    cat > .env << ENVEOF
# ============================================================
# Auto-generated by deploy.sh on $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

# Domain
FRONTEND_URL=https://$DOMAIN

# MySQL Database
MYSQL_ROOT_PASSWORD=$db_root_pw
MYSQL_DATABASE=space_card_shop
MYSQL_USER=cardshop
MYSQL_PASSWORD=$db_pw
MYSQL_EXTERNAL_PORT=127.0.0.1:3307

# JWT Authentication
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=7d

# Node.js
NODE_ENV=production
PORT=3000
ENVEOF

    chmod 600 .env
    ok "Created .env with auto-generated secrets (chmod 600)"

    divider
    echo -e "  ${DIM}Database user:     cardshop${NC}"
    echo -e "  ${DIM}Database name:     space_card_shop${NC}"
    echo -e "  ${DIM}DB password:       (auto-generated, see .env)${NC}"
    echo -e "  ${DIM}JWT secret:        (auto-generated, see .env)${NC}"
    divider

    # ---- Prepare Nginx config (HTTP-only for initial deploy) ----
    info "Preparing Nginx config for HTTP (pre-SSL)..."
    mkdir -p nginx/conf.d certbot/www certbot/conf

    cat > nginx/conf.d/default.conf << NGINXEOF
# Auto-generated HTTP config for initial deployment
# SSL will be added after certbot runs

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy to Express.js backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }

    location /admin {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }
}
NGINXEOF

    ok "Nginx HTTP config generated for: $DOMAIN"
}

# ==========================================================
#  PHASE 5: Build & Launch (docker compose up)
# ==========================================================

build_and_start() {
    step "Phase 5/6 · Build & Start Services"

    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    if [ ! -f .env ]; then
        err ".env not found. Cannot start without configuration."
        exit 1
    fi

    if [ ! -f docker-compose.yml ]; then
        err "docker-compose.yml not found in $app_dir"
        exit 1
    fi

    # Open firewall ports if ufw is active
    if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
        info "Opening firewall ports 80, 443..."
        ufw allow 80/tcp  >> "$LOG_FILE" 2>&1
        ufw allow 443/tcp >> "$LOG_FILE" 2>&1
        ok "Firewall rules added (80, 443)"
    fi

    info "Building Docker images (this may take 2-5 minutes)..."
    docker compose build --no-cache 2>&1 | tee -a "$LOG_FILE" | \
        while IFS= read -r line; do
            # Show only milestone lines to keep output clean
            case "$line" in
                *"Step"*|*"DONE"*|*"exporting"*|*"naming"*|*"Successfully"*)
                    echo -e "  ${DIM}  $line${NC}" ;;
            esac
        done
    ok "Docker images built"

    info "Starting all services..."
    docker compose up -d 2>&1 | tee -a "$LOG_FILE"
    ok "All services started"

    echo ""
    divider
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
    divider
    echo ""

    # Wait for MySQL to be healthy
    info "Waiting for MySQL to initialize..."
    local max_wait=60
    local waited=0
    while [ $waited -lt $max_wait ]; do
        if docker compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
            break
        fi
        sleep 2
        waited=$((waited + 2))
        printf "  ${DIM}  waiting... (%ds)${NC}\r" "$waited"
    done
    echo ""

    if [ $waited -ge $max_wait ]; then
        warn "MySQL took longer than expected. Check: docker compose logs mysql"
    else
        ok "MySQL is healthy (${waited}s)"
    fi

    # Quick health check on the web service
    sleep 3
    if curl -sf http://localhost:3000/api/products &>/dev/null; then
        ok "Web service is responding on port 3000"
    else
        warn "Web service not responding yet. It may need a few more seconds."
        info "Check logs: docker compose logs -f web"
    fi
}

# ==========================================================
#  PHASE 6: SSL Certificate (Let's Encrypt via Certbot)
# ==========================================================

setup_ssl() {
    step "Phase 6/6 · SSL Certificate (Let's Encrypt)"

    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    # Read domain from .env
    local domain
    domain=$(grep '^FRONTEND_URL=' .env | sed 's|FRONTEND_URL=https://||' | tr -d '\r\n')

    if [ -z "$domain" ]; then
        err "Cannot read domain from .env"
        exit 1
    fi

    # Check if SSL cert already exists
    if [ -f "certbot/conf/live/$domain/fullchain.pem" ]; then
        ok "SSL certificate already exists for $domain"
        enable_https "$domain"
        return 0
    fi

    info "Requesting SSL certificate for: $domain"
    info "Make sure DNS A record points to this server's IP!"
    echo ""

    # Verify DNS resolution
    local server_ip
    server_ip=$(curl -sf https://api.ipify.org 2>/dev/null || curl -sf https://ifconfig.me 2>/dev/null || echo "unknown")
    info "This server's public IP: $server_ip"

    local dns_ip
    dns_ip=$(dig +short "$domain" 2>/dev/null | head -1 || echo "unresolved")
    info "DNS for $domain resolves to: $dns_ip"

    if [ "$server_ip" != "$dns_ip" ] && [ "$dns_ip" != "unresolved" ]; then
        warn "DNS does not point to this server! SSL will likely fail."
        read -rp "  Continue anyway? (y/N): " proceed
        if [[ ! "$proceed" =~ ^[Yy]$ ]]; then
            info "Skipping SSL. You can run this later: sudo ./deploy.sh --ssl"
            show_no_ssl_summary "$domain"
            return 0
        fi
    fi

    # Make sure nginx is running (needed for ACME challenge)
    if ! docker compose ps nginx 2>/dev/null | grep -q "running"; then
        warn "Nginx is not running. Starting it first..."
        docker compose up -d nginx
        sleep 3
    fi

    # Create certbot dirs
    mkdir -p certbot/www certbot/conf

    # Determine certbot email args
    local email_args=""
    if [ -n "${SSL_EMAIL:-}" ]; then
        email_args="--email $SSL_EMAIL"
    else
        email_args="--register-unsafely-without-email"
    fi

    # Request certificate via webroot
    info "Running certbot (webroot mode)..."
    if docker compose run --rm certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d "$domain" \
        $email_args \
        --agree-tos \
        --non-interactive \
        --force-renewal 2>&1 | tee -a "$LOG_FILE"; then

        ok "SSL certificate obtained!"
        enable_https "$domain"
    else
        err "Certbot failed. Common causes:"
        echo -e "  ${DIM}  1. DNS A record not pointing to this server${NC}"
        echo -e "  ${DIM}  2. Port 80 blocked by firewall or cloud provider${NC}"
        echo -e "  ${DIM}  3. Domain not yet propagated (wait a few minutes)${NC}"
        echo ""
        info "Your site is still accessible via HTTP at: http://$domain"
        info "Re-run SSL setup later: sudo ./deploy.sh --ssl"
    fi
}

# Helper: switch Nginx from HTTP-only to full HTTPS config
enable_https() {
    local domain="$1"
    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    info "Generating HTTPS Nginx config..."

    cat > nginx/conf.d/default.conf << 'NGINXEOF'
# ==========================================================
# Auto-generated HTTPS config — DO_NOT_EDIT_DOMAIN
# ==========================================================

# HTTP → HTTPS redirect + ACME challenge
server {
    listen 80;
    listen [::]:80;
    server_name DO_NOT_EDIT_DOMAIN www.DO_NOT_EDIT_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DO_NOT_EDIT_DOMAIN www.DO_NOT_EDIT_DOMAIN;

    # --- SSL ---
    ssl_certificate     /etc/letsencrypt/live/DO_NOT_EDIT_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DO_NOT_EDIT_DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling        on;
    ssl_stapling_verify on;
    resolver            8.8.8.8 8.8.4.4 valid=300s;

    # --- Security Headers ---
    add_header X-Frame-Options            "SAMEORIGIN"                    always;
    add_header X-Content-Type-Options     "nosniff"                       always;
    add_header X-XSS-Protection           "1; mode=block"                 always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security  "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy         "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self';" always;

    # --- Auth endpoints (strict rate limit: 5 req/min) ---
    location /api/auth/ {
        limit_req zone=login burst=3 nodelay;
        proxy_pass         http://backend;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection "";
    }

    # --- API endpoints (30 req/s) ---
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass         http://backend;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection "";
        proxy_buffering    off;
        proxy_connect_timeout 10s;
        proxy_send_timeout    30s;
        proxy_read_timeout    30s;
    }

    # --- Admin panel ---
    location /admin {
        proxy_pass         http://backend;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection "";
    }

    # --- Frontend (catch-all) ---
    location / {
        proxy_pass         http://backend;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection "";

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
            proxy_pass http://backend;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Block dotfiles
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINXEOF

    # Replace placeholder with actual domain
    sed -i "s|DO_NOT_EDIT_DOMAIN|$domain|g" nginx/conf.d/default.conf

    # Restart nginx to pick up SSL config
    docker compose restart nginx 2>&1 | tee -a "$LOG_FILE"
    ok "HTTPS enabled for: https://$domain"
}

# Helper: summary when SSL is skipped
show_no_ssl_summary() {
    local domain="$1"
    echo ""
    divider
    echo -e "  ${YELLOW}Site running in HTTP mode:${NC}"
    echo ""
    echo -e "  Shop:    http://$domain"
    echo -e "  Admin:   http://$domain/admin"
    echo -e "  API:     http://$domain/api/products"
    echo ""
    echo -e "  ${DIM}To add SSL later:${NC}"
    echo -e "  ${DIM}  1. Point DNS A record to this server${NC}"
    echo -e "  ${DIM}  2. Run: sudo ./deploy.sh --ssl${NC}"
    divider
}

# ==========================================================
#  Full Deploy (Phases 1-6 in sequence)
# ==========================================================

full_deploy() {
    show_banner
    echo -e "  ${BOLD}Starting full deployment...${NC}"
    echo -e "  ${DIM}Log: $LOG_FILE${NC}"
    echo ""

    install_prerequisites   # Phase 1
    install_docker          # Phase 2
    clone_or_pull           # Phase 3
    setup_environment       # Phase 4
    build_and_start         # Phase 5
    setup_ssl               # Phase 6

    show_final_summary
}

# ==========================================================
#  Final Summary
# ==========================================================

show_final_summary() {
    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir" 2>/dev/null || true

    local domain
    domain=$(grep '^FRONTEND_URL=' .env 2>/dev/null | sed 's|FRONTEND_URL=https\?://||' | tr -d '\r\n')

    local has_ssl="no"
    if [ -f "certbot/conf/live/$domain/fullchain.pem" ] 2>/dev/null; then
        has_ssl="yes"
    fi

    local protocol="http"
    [ "$has_ssl" = "yes" ] && protocol="https"

    echo ""
    echo -e "  ${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "  ${GREEN}║                                            ║${NC}"
    echo -e "  ${GREEN}║${NC}        ${BOLD}Deployment Complete!${NC}                ${GREEN}║${NC}"
    echo -e "  ${GREEN}║                                            ║${NC}"
    echo -e "  ${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Your site:${NC}"
    echo ""
    echo -e "    Shop:       ${CYAN}${protocol}://${domain}${NC}"
    echo -e "    Admin:      ${CYAN}${protocol}://${domain}/admin${NC}"
    echo -e "    API:        ${CYAN}${protocol}://${domain}/api/products${NC}"
    echo ""
    echo -e "  ${BOLD}Default admin login:${NC}"
    echo ""
    echo -e "    Username:   ${YELLOW}admin${NC}"
    echo -e "    Password:   ${YELLOW}admin123${NC}"
    echo -e "    ${RED}⚠  Change this immediately after first login!${NC}"
    echo ""
    divider
    echo ""
    echo -e "  ${BOLD}Useful commands:${NC}"
    echo ""
    echo -e "    ${DIM}cd $app_dir${NC}"
    echo -e "    ${DIM}docker compose ps              # service status${NC}"
    echo -e "    ${DIM}docker compose logs -f web      # app logs${NC}"
    echo -e "    ${DIM}docker compose logs -f mysql    # db logs${NC}"
    echo -e "    ${DIM}sudo ./deploy.sh               # management menu${NC}"
    echo ""
    divider
    echo ""
    echo -e "  ${DIM}Deploy log: $LOG_FILE${NC}"
    echo ""
}

# ==========================================================
#  Management Menu (for subsequent runs)
# ==========================================================

show_menu() {
    show_banner
    echo -e "  ${BOLD}Management Menu${NC}"
    echo ""
    echo "    1)  Full deploy (first-time setup)"
    echo "    2)  Update & redeploy (git pull + rebuild)"
    echo "    3)  Setup / renew SSL certificate"
    echo "    4)  View service status"
    echo "    5)  View logs"
    echo "    6)  Backup database"
    echo "    7)  Restore database from backup"
    echo "    8)  Stop all services"
    echo "    9)  Start all services"
    echo "    10) Restart all services"
    echo "    11) Change domain"
    echo "    0)  Exit"
    echo ""
    read -rp "  Choose [0-11]: " choice
}

menu_update_deploy() {
    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    step "Update & Redeploy"

    info "Pulling latest code..."
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || warn "git pull failed"

    info "Rebuilding web service..."
    docker compose build --no-cache web 2>&1 | tail -5

    info "Restarting services..."
    docker compose up -d
    docker compose restart nginx 2>/dev/null || true

    ok "Update complete!"
    echo ""
    docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || docker compose ps
}

menu_view_logs() {
    echo ""
    echo "    1) Web (Express.js)"
    echo "    2) MySQL"
    echo "    3) Nginx"
    echo "    4) All services"
    echo ""
    read -rp "  Choose [1-4]: " lc

    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    case "${lc:-}" in
        1) docker compose logs -f --tail=80 web ;;
        2) docker compose logs -f --tail=80 mysql ;;
        3) docker compose logs -f --tail=80 nginx ;;
        4) docker compose logs -f --tail=80 ;;
        *) warn "Invalid choice" ;;
    esac
}

menu_backup_db() {
    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    step "Database Backup"

    local backup_dir="$app_dir/backups"
    mkdir -p "$backup_dir"

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/space_card_shop_$timestamp.sql.gz"

    # shellcheck disable=SC1091
    source .env

    info "Dumping database..."
    docker compose exec -T mysql mysqldump \
        -u root \
        -p"$MYSQL_ROOT_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        "$MYSQL_DATABASE" 2>/dev/null \
        | gzip > "$backup_file"

    if [ -s "$backup_file" ]; then
        local size
        size=$(du -h "$backup_file" | cut -f1)
        ok "Backup saved: $backup_file ($size)"
    else
        err "Backup appears empty"
        rm -f "$backup_file"
        return 1
    fi

    # Rotate: keep last 10
    cd "$backup_dir"
    # shellcheck disable=SC2012
    ls -t ./*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    cd "$app_dir"

    info "Total backups: $(ls "$backup_dir"/*.sql.gz 2>/dev/null | wc -l)"
}

menu_restore_db() {
    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    step "Database Restore"

    local backup_dir="$app_dir/backups"
    if [ ! -d "$backup_dir" ] || [ -z "$(ls "$backup_dir"/*.sql.gz 2>/dev/null)" ]; then
        err "No backups found in $backup_dir"
        return 1
    fi

    echo ""
    echo "  Available backups:"
    echo ""
    local i=1
    local files=()
    while IFS= read -r f; do
        local size
        size=$(du -h "$f" | cut -f1)
        echo "    $i) $(basename "$f")  ($size)"
        files+=("$f")
        i=$((i + 1))
    done < <(ls -t "$backup_dir"/*.sql.gz)

    echo ""
    read -rp "  Choose backup number: " pick
    pick=$((pick - 1))

    if [ $pick -lt 0 ] || [ $pick -ge ${#files[@]} ]; then
        err "Invalid selection"
        return 1
    fi

    local chosen="${files[$pick]}"
    warn "This will OVERWRITE the current database!"
    read -rp "  Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        info "Restore cancelled"
        return 0
    fi

    # shellcheck disable=SC1091
    source .env

    info "Restoring from: $(basename "$chosen")"
    gunzip -c "$chosen" | docker compose exec -T mysql mysql \
        -u root \
        -p"$MYSQL_ROOT_PASSWORD" \
        "$MYSQL_DATABASE" 2>/dev/null

    ok "Database restored. Restarting web service..."
    docker compose restart web
    ok "Done"
}

menu_change_domain() {
    local app_dir="${APP_DIR:-$DEFAULT_APP_DIR}"
    cd "$app_dir"

    step "Change Domain"

    echo ""
    read -rp "  Enter new domain: " new_domain
    new_domain=$(echo "$new_domain" | sed 's|https\?://||' | sed 's|/||g')

    if [ -z "$new_domain" ]; then
        err "Domain cannot be empty"
        return 1
    fi

    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$new_domain|" .env
    ok "Updated .env"

    # Regenerate nginx config (HTTP-only until SSL is set up)
    setup_environment_nginx_only "$new_domain"

    docker compose restart nginx
    ok "Nginx restarted with new domain: $new_domain"

    echo ""
    info "If you need SSL for the new domain, run option 3 from the menu."
}

setup_environment_nginx_only() {
    local domain="$1"

    cat > nginx/conf.d/default.conf << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $domain www.$domain;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }

    location /admin {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }
}
NGINXEOF
}

# ==========================================================
#  CLI Argument Handling
# ==========================================================

# Detect the project directory for subsequent runs
detect_app_dir() {
    # If running from inside the project
    if [ -f "./docker-compose.yml" ]; then
        APP_DIR="$(pwd)"
        return 0
    fi

    # Check default location
    if [ -f "$DEFAULT_APP_DIR/docker-compose.yml" ]; then
        APP_DIR="$DEFAULT_APP_DIR"
        return 0
    fi

    # Check script location
    local script_loc
    script_loc="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$script_loc/docker-compose.yml" ]; then
        APP_DIR="$script_loc"
        return 0
    fi

    APP_DIR="$DEFAULT_APP_DIR"
}

# ==========================================================
#  Entry Point
# ==========================================================

main() {
    # Initialize log
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    echo "" >> "$LOG_FILE" 2>/dev/null || true
    log "=== deploy.sh v$SCRIPT_VERSION started ==="

    check_root
    detect_app_dir

    # Handle CLI flags
    case "${1:-}" in
        --full)
            full_deploy
            exit 0
            ;;
        --ssl)
            DOMAIN=$(grep '^FRONTEND_URL=' "$APP_DIR/.env" 2>/dev/null | sed 's|FRONTEND_URL=https://||' | tr -d '\r\n')
            cd "$APP_DIR"
            setup_ssl
            show_final_summary
            exit 0
            ;;
        --update)
            cd "$APP_DIR"
            menu_update_deploy
            exit 0
            ;;
        --backup)
            cd "$APP_DIR"
            menu_backup_db
            exit 0
            ;;
        --status)
            cd "$APP_DIR"
            docker compose ps
            exit 0
            ;;
        --help|-h)
            show_banner
            echo "  Usage: sudo ./deploy.sh [OPTION]"
            echo ""
            echo "  Options:"
            echo "    (none)       Interactive management menu"
            echo "    --full       Run full first-time deployment"
            echo "    --ssl        Setup / renew SSL certificate"
            echo "    --update     Pull latest code and redeploy"
            echo "    --backup     Backup database"
            echo "    --status     Show service status"
            echo "    --help       Show this help"
            echo ""
            exit 0
            ;;
    esac

    # Interactive menu
    while true; do
        show_menu
        case "${choice:-}" in
            1)  full_deploy ;;
            2)  menu_update_deploy ;;
            3)  cd "$APP_DIR"; setup_ssl; show_final_summary ;;
            4)  cd "$APP_DIR"; docker compose ps ;;
            5)  menu_view_logs ;;
            6)  menu_backup_db ;;
            7)  menu_restore_db ;;
            8)  cd "$APP_DIR"; docker compose down; ok "All services stopped" ;;
            9)  cd "$APP_DIR"; docker compose up -d; ok "All services started" ;;
            10) cd "$APP_DIR"; docker compose restart; ok "All services restarted" ;;
            11) menu_change_domain ;;
            0)  echo "  Bye!"; exit 0 ;;
            *)  warn "Invalid choice" ;;
        esac
    done
}

main "$@"
