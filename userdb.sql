CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255)
);

CREATE TABLE tenant_users (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- OWNER, MANAGER, STAFF
    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_number VARCHAR(10) NOT NULL,
    qr_code_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'available'
);

WITH ins_tenant AS (
    INSERT INTO tenants (name, slug) 
    VALUES ('L' 'Osteria Pizza', 'l-osteria') 
    RETURNING id
),
ins_user AS (
    INSERT INTO users (email, password_hash, full_name) 
    VALUES ('owner@osteria.com', 'hashed_pass_123', 'Anh Chủ Quán') 
    RETURNING id
)
INSERT INTO tenant_users (tenant_id, user_id, role)
SELECT ins_tenant.id, ins_user.id, 'OWNER' FROM ins_tenant, ins_user;

INSERT INTO tables (tenant_id, table_number, qr_code_token)
SELECT id, 'Bàn A1', encode(gen_random_bytes(10), 'hex') FROM tenants WHERE slug = 'l-osteria'
UNION ALL
SELECT id, 'Bàn A2', encode(gen_random_bytes(10), 'hex') FROM tenants WHERE slug = 'l-osteria';

SELECT 
    t.name AS nha_hang,
    u.full_name AS nguoi_quan_ly,
    tb.table_number AS so_ban,
    tb.qr_code_token AS ma_qr
FROM tenants t
JOIN tenant_users tu ON t.id = tu.tenant_id
JOIN users u ON u.id = tu.user_id

JOIN tables tb ON t.id = tb.tenant_id;
