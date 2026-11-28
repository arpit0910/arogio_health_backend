# Database certificate authorities

`supabase-root-2021.crt` is Supabase's public root certificate, downloaded over verified HTTPS from [Supabase's certificate endpoint](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). It is public trust material, not a private key or credential.

SHA-256 fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. Expires 26 April 2031.

The explicit reset utility uses it only for Supabase database/pooler hosts and retains certificate and hostname verification. No TLS verification is disabled. See [Supabase SSL verification guidance](https://supabase.com/docs/guides/platform/ssl-enforcement).
