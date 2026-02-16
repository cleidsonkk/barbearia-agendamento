# Sistema de Agendamento para Barbearia (Responsivo • 2026)

Stack: Next.js (App Router) + TypeScript + TailwindCSS + NextAuth + Prisma + PostgreSQL

## Recursos
- Cliente só vê horários **após login**
- Cadastro do cliente com **WhatsApp obrigatório**
- Painel do barbeiro com:
  - Agenda do dia
  - Serviços (duração e preço)
  - Fechar barbearia (bloquear período)
  - Horários (Seg–Sáb 08:00–20:00, base 20 min)
- Reserva com trava anti-conflito no banco (unique)

## Como rodar
1) Instale dependências:
```bash
npm install
```

2) Crie `.env` (use `.env.example` como base)

3) Rode migrações:
```bash
npx prisma migrate dev --name init
```

4) (Opcional) Seed (cria barbeiro padrão e serviços):
```bash
npm run prisma:seed
```

5) Inicie:
```bash
npm run dev
```

Acesse:
- Site: http://localhost:3000
- Login: http://localhost:3000/login
- Painel: http://localhost:3000/dashboard

## Deploy (Vercel + Neon)
- Configure env vars no painel:
  - DATABASE_URL
  - NEXTAUTH_URL
  - NEXTAUTH_SECRET
- Rode `npx prisma migrate deploy` no pipeline/build (ou manualmente)
