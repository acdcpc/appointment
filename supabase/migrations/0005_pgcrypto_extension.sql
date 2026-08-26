-- Enable pgcrypto for gen_random_bytes (guardian challenge tokens).
create extension if not exists pgcrypto;
