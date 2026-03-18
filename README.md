# Contato - API 🚀

Esta é a API do jogo **Contato**, reconstruída em Node.js com TypeScript e MongoDB para substituir o antigo backend em Firebase. A arquitetura foi desenhada para ser modular, escalável e fácil de manter.

## 🏗️ Arquitetura (Modular)

A `contato-api/src` está organizada da seguinte forma:

- **`game/`**: Lógica central e estado do jogo.
    - `state.ts`: Gerenciamento do estado em memória e persistência.
    - `entities.ts`: Modelos de dados do MongoDB (Mongoose).
    - `types.ts`: Tipos de domínio do jogo.
- **`sockets/`**: Toda a camada de comunicação via WebSockets.
    - `handlers.ts`: Processamento de eventos (join, clue, action).
    - `types.ts`: Tipos de payloads e eventos de socket.
- **`shared/`**: Tipos e utilitários compartilhados entre módulos.
- **`index.ts`**: Ponto de entrada que inicializa o servidor HTTP e WebSocket.

## 🛠️ Tecnologias

- **Linguagem**: TypeScript
- **Runtime**: Node.js
- **Banco de Dados**: MongoDB
- **Comunicação**: WebSockets (`ws`)
- **Infraestrutura**: Docker & Docker Compose

## 🚀 Como Rodar

A maneira mais fácil de rodar o projeto é via Docker utilizando o **Makefile** incluso:

### Pré-requisitos
- Docker e Docker Compose instalados.
- Um arquivo `.env` na raiz (exemplo em `.env.example`).

### Comandos Principais

```bash
# Iniciar a API e o MongoDB em background
make up

# Ver logs em tempo real
make logs

# Parar todos os serviços
make down
```

> [!TIP]
> O Docker Compose usa perfis para alternar redes e serviços. Defina `PROFILE` (ex.: `local`, `dev`, `hml`, `prod`) no `.env` ou no comando:
> ```bash
> PROFILE=prod make up   # usa backend-proxy na proxy_network
> PROFILE=local make up  # expõe a porta 3001 e sobe o Mongo local
> ```

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
PORT=3001
MONGO_URI=mongodb://mongodb:27017/contato
```

## 🔐 Configuração de Rede

Esta API foi configurada para rodar atrás de um proxy reverso (como Nginx Proxy Manager). Ela utiliza a rede externa `proxy_network` para se comunicar com o proxy sem expor portas diretamente ao IP público, garantindo maior segurança.
