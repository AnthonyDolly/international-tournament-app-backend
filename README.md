# Copa Libertadores API

A RESTful API for managing Copa Libertadores tournament matches, teams, and stages. Built with NestJS and MongoDB.

## Features

- Tournament management
- Team registration and management
- Match scheduling and results tracking
- Support for different tournament stages:
  - Qualifying Stage
  - Group Stage
  - Knockout Stage
- Two-legged matches with aggregate scoring
- Penalty shootout support
- Group classification and standings
- Team statistics tracking

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- Docker and Docker Compose (for containerized MongoDB)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd copa-libertadores
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory with the following variables:
```env
MONGODB_URI=mongodb://localhost:27017/copa-libertadores
PORT=3000
```

4. Start MongoDB using Docker Compose:
```bash
# Start MongoDB container
docker-compose up -d

# To stop MongoDB container
docker-compose down
```

Alternatively, you can start MongoDB service directly:
```bash
# On Ubuntu/Debian
sudo service mongod start

# On macOS with Homebrew
brew services start mongodb-community
```

5. Start the development server:
```bash
npm run start:dev
# or
yarn start:dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Tournaments
- `POST /tournaments` - Create a new tournament
- `GET /tournaments` - Get all tournaments
- `GET /tournaments/:id` - Get tournament by ID
- `PATCH /tournaments/:id` - Update tournament
- `DELETE /tournaments/:id` - Delete tournament

### Teams
- `POST /teams` - Create a new team
- `GET /teams` - Get all teams
- `GET /teams/:id` - Get team by ID
- `PATCH /teams/:id` - Update team
- `DELETE /teams/:id` - Delete team

### Matches
- `POST /matches` - Create a new match
- `GET /matches` - Get all matches
- `GET /matches/:id` - Get match by ID
- `PATCH /matches/:id` - Update match
- `DELETE /matches/:id` - Delete match

### Tournament Teams
- `POST /tournament-teams` - Register a team in a tournament
- `GET /tournament-teams` - Get all tournament teams
- `GET /tournament-teams/:id` - Get tournament team by ID

### Qualifying Stages
- `POST /qualifying-stages` - Create a qualifying stage
- `GET /qualifying-stages` - Get all qualifying stages
- `GET /qualifying-stages/:id` - Get qualifying stage by ID
- `PATCH /qualifying-stages/:id` - Update qualifying stage

### Knockout Stages
- `POST /knockout-stages` - Create a knockout stage
- `GET /knockout-stages` - Get all knockout stages
- `GET /knockout-stages/:id` - Get knockout stage by ID
- `PATCH /knockout-stages/:id` - Update knockout stage

### Group Classification
- `GET /group-classification` - Get group classifications
- `GET /group-classification/:tournamentId/:groupId` - Get classification by tournament and group

## Project Structure

```
src/
├── matches/                 # Match management
├── tournaments/            # Tournament management
├── teams/                  # Team management
├── tournament-teams/       # Tournament team registration
├── qualifying-stages/      # Qualifying stage management
├── knockout-stages/        # Knockout stage management
├── group-classification/   # Group stage standings
└── common/                 # Shared utilities and interfaces
```

## Match Types

The API supports different types of matches:

1. **Qualifying Stage Matches**
   - First Leg
   - Second Leg
   - Aggregate scoring
   - Penalty shootout support

2. **Group Stage Matches**
   - Single match format
   - Match day tracking (1-6)
   - Group standings calculation

3. **Knockout Stage Matches**
   - First Leg
   - Second Leg
   - Single Match (for finals)
   - Aggregate scoring
   - Penalty shootout support

## Development

### Running Tests
```bash
npm run test
# or
yarn test
```

### Building for Production
```bash
npm run build
# or
yarn build
```

### Running in Production Mode
```bash
npm run start:prod
# or
yarn start:prod
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
