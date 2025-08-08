# nginx/common-routes.conf
# Shared location blocks for both HTTP and HTTPS server blocks

# SSE-specific location for /api/events (must come before /api/)
location /api/events/ {
  proxy_pass http://server:4000/api/events/;
  
  # SSE-specific settings
  proxy_buffering off;
  proxy_cache off;
  proxy_set_header Connection '';
  proxy_http_version 1.1;
  proxy_read_timeout 86400s;  # 24 hours
  proxy_send_timeout 86400s;  # 24 hours
  
  # Headers for SSE
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  
  # Ensure no buffering for real-time data
  proxy_no_cache 1;
  proxy_cache_bypass 1;
}

# Resume file upload routes to Next.js frontend (must be exact match)
location = /api/resume/upload {
  proxy_pass http://web:3000/api/resume/upload;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  
  # Allow large file uploads for resumes
  client_max_body_size 10M;
  proxy_request_buffering off;
}

# Resume API routes to backend server (for processing and feedback)
location /api/resume {
  proxy_pass http://server:4000/api/resume;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# API proxy to backend server (for search, favorites, etc.)
location /api/ {
  proxy_pass http://server:4000;
  add_header X-Frame-Options DENY always;
  add_header Content-Security-Policy "frame-ancestors 'none'" always;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Front-end (assumes container called `web` on port 3000)
location / {
  proxy_pass http://web:3000;
  add_header X-Frame-Options DENY always;
  add_header Content-Security-Policy "frame-ancestors 'none'" always;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Canonicalize subpath to include trailing slash
location = /grafana {
  return 301 /grafana/;
}

# Grafana on a sub-path (allow embedding only here)
location /grafana/ {
  proxy_http_version 1.1;
  proxy_pass http://grafana:3000/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-Prefix /grafana;
  proxy_set_header X-Forwarded-Uri $request_uri; 
  proxy_read_timeout 600s;
  proxy_send_timeout 600s;

  proxy_redirect off;
  proxy_buffering off;

  # Additional headers for Grafana
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Server $host;
  proxy_set_header X-Forwarded-Port $server_port;

  # Relax frame protections for Grafana only (same-origin)
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Content-Security-Policy "frame-ancestors 'self'" always;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# Grafana live websocket upgrades
location /grafana/api/live/ {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_pass http://grafana:3000/api/live/;
}
