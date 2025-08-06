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
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Front-end (assumes container called `web` on port 3000)
location / {
  proxy_pass http://web:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Grafana on a sub-path
location /grafana/ {
  proxy_pass http://grafana:3000/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  
  # Additional headers for Grafana
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Server $host;
  proxy_set_header X-Forwarded-Port $server_port;
}
