import { Injectable, BadRequestException } from '@nestjs/common';
import { TeamDraw } from '../entities/team-draw.entity';

export interface QualifyingMatch {
  id: string;
  matchNumber: number;
  firstTeam: TeamDraw | string;
  secondTeam: TeamDraw | string;
  winnerPlaceholder: string;
  stage: number;
}

export interface QualifyingStageResult {
  phase1: QualifyingMatch[];
  phase2: QualifyingMatch[];
  phase3: QualifyingMatch[];
  summary: {
    totalTeams: number;
    phase1Teams: number;
    phase2Teams: number;
    phase3Teams: number;
    qualifiedToGroupStage: number;
  };
}

interface ProcessedTeam {
  id: string;
  name: string;
  country: string;
  ranking?: number;
  qualifyingEntryStage: number;
  bombo: number;
  logo: string;
  isCurrentChampion: boolean;
  isFromQualifyingStage: boolean;
}

@Injectable()
export class QualifyingStageDrawService {
  /**
   * Generate a complete qualifying stage draw for Copa Libertadores with randomization
   * @param teams Teams data from teams.service.findAll({ isFromQualifyingStage: true })
   * @returns Complete draw structure with phases 1, 2, and 3
   */
  generateDraw(teams: any[]): QualifyingStageResult {
    const qualifyingTeams = this.filterAndMapQualifyingTeams(teams);

    // Separate teams by qualifying entry stage
    const phase1Teams = qualifyingTeams.filter(
      (team) => team.qualifyingEntryStage === 1,
    );
    const phase2DirectTeams = qualifyingTeams.filter(
      (team) => team.qualifyingEntryStage === 2,
    );

    this.validateTeamCounts(phase1Teams, phase2DirectTeams);

    // ========== PHASE 1 DRAW ==========
    const phase1Matches = this.drawPhase1(phase1Teams);

    // ========== PHASE 2 DRAW ==========
    const phase2Matches = this.drawPhase2(phase2DirectTeams, phase1Matches);

    // ========== PHASE 3 DRAW ==========
    const phase3Matches = this.drawPhase3(phase2Matches);

    return {
      phase1: phase1Matches,
      phase2: phase2Matches,
      phase3: phase3Matches,
      summary: {
        totalTeams: qualifyingTeams.length,
        phase1Teams: phase1Teams.length,
        phase2Teams: phase2DirectTeams.length + 3, // 13 direct + 3 from phase 1
        phase3Teams: 8,
        qualifiedToGroupStage: 4,
      },
    };
  }

  private filterAndMapQualifyingTeams(teams: any[]): ProcessedTeam[] {
    return teams
      .filter((team) => team.isFromQualifyingStage)
      .map((team) => ({
        id: team._id.toString(),
        name: team.name,
        country: team.country,
        ranking: team.ranking,
        qualifyingEntryStage: team.qualifyingEntryStage,
        bombo: team.bombo,
        logo: team.logo,
        isCurrentChampion: team.isCurrentChampion || false,
        isFromQualifyingStage: true,
      }));
  }

  private validateTeamCounts(
    phase1Teams: ProcessedTeam[],
    phase2DirectTeams: ProcessedTeam[],
  ): void {
    if (phase1Teams.length !== 6) {
      throw new BadRequestException(
        `Phase 1 requires exactly 6 teams, but found ${phase1Teams.length}`,
      );
    }

    if (phase2DirectTeams.length !== 13) {
      throw new BadRequestException(
        `Phase 2 requires exactly 13 direct teams, but found ${phase2DirectTeams.length}`,
      );
    }
  }

  /**
   * Create bolilleros (draw pots) for Phase 1
   * Best 3 teams vs worst 3 teams
   */
  private createPhase1Bolilleros(
    phase1Teams: ProcessedTeam[],
  ): [ProcessedTeam[], ProcessedTeam[]] {
    const teamsWithRanking = phase1Teams.filter(
      (team) => team.ranking !== undefined,
    );
    const teamsWithoutRanking = phase1Teams.filter(
      (team) => team.ranking === undefined,
    );

    // Sort teams with ranking (lower ranking = better)
    teamsWithRanking.sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

    // Combine teams: ranked teams first, then unranked teams
    const allTeamsSorted = [...teamsWithRanking, ...teamsWithoutRanking];

    const bolillero1 = allTeamsSorted.slice(0, 3); // Best 3 teams
    const bolillero2 = allTeamsSorted.slice(3, 6); // Worst 3 teams

    return [bolillero1, bolillero2];
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Draw Phase 1: 6 teams -> 3 matches -> 3 winners
   * Pot 1 (best 3) vs Pot 2 (worst 3)
   */
  private drawPhase1(phase1Teams: ProcessedTeam[]): QualifyingMatch[] {
    const [bolillero1, bolillero2] = this.createPhase1Bolilleros(phase1Teams);

    // Shuffle both bolilleros
    const shuffledB1 = this.shuffleArray(bolillero1);
    const shuffledB2 = this.shuffleArray(bolillero2);

    const matches: QualifyingMatch[] = [];

    for (let i = 0; i < 3; i++) {
      const teamB1 = shuffledB1[i]; // Always firstTeam (from Pot 1)
      const teamB2 = shuffledB2[i]; // Always secondTeam (from Pot 2)

      const firstTeamDraw = this.createTeamDraw(teamB1);
      const secondTeamDraw = this.createTeamDraw(teamB2);
      const winnerPlaceholder = `Winner of ${this.toTitleCase(teamB1.name)} vs ${this.toTitleCase(teamB2.name)}`;

      matches.push({
        id: `phase1-match-${i + 1}`,
        matchNumber: i + 1,
        firstTeam: firstTeamDraw,
        secondTeam: secondTeamDraw,
        winnerPlaceholder,
        stage: 1,
      });
    }

    return matches;
  }

  /**
   * Create bolilleros (draw pots) for Phase 2
   * Pot 1: Best 8 teams from direct teams
   * Pot 2: Remaining 5 direct teams + 3 Phase 1 winners
   */
  private createPhase2Bolilleros(
    phase2DirectTeams: ProcessedTeam[],
    phase1Winners: string[],
  ): [TeamDraw[], (TeamDraw | string)[]] {
    // Sort direct teams by ranking
    const teamsWithRanking = phase2DirectTeams.filter(
      (team) => team.ranking !== undefined,
    );
    const teamsWithoutRanking = phase2DirectTeams.filter(
      (team) => team.ranking === undefined,
    );

    teamsWithRanking.sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

    // Combine: ranked teams first, then unranked teams
    const allDirectTeamsSorted = [...teamsWithRanking, ...teamsWithoutRanking];

    // Pot 1: Best 8 direct teams
    const pot1Teams = allDirectTeamsSorted
      .slice(0, 8)
      .map((team) => this.createTeamDraw(team));

    // Pot 2: Remaining 5 direct teams + 3 Phase 1 winners
    const pot2DirectTeams = allDirectTeamsSorted
      .slice(8, 13)
      .map((team) => this.createTeamDraw(team));
    const pot2Teams: (TeamDraw | string)[] = [
      ...pot2DirectTeams,
      ...phase1Winners,
    ];

    return [pot1Teams, pot2Teams];
  }

  /**
   * Draw Phase 2: 13 direct teams + 3 Phase 1 winners -> 8 matches -> 8 winners
   * Pot 1 (8 best direct teams) vs Pot 2 (5 remaining direct + 3 Phase 1 winners)
   */
  private drawPhase2(
    phase2DirectTeams: ProcessedTeam[],
    phase1Matches: QualifyingMatch[],
  ): QualifyingMatch[] {
    // Get Phase 1 winners
    const phase1WinnerPlaceholders = phase1Matches.map(
      (match) => match.winnerPlaceholder,
    );

    // Create bolilleros for Phase 2
    const [pot1Teams, pot2Teams] = this.createPhase2Bolilleros(
      phase2DirectTeams,
      phase1WinnerPlaceholders,
    );

    // Shuffle both pots
    const shuffledPot1 = this.shuffleArray(pot1Teams);
    const shuffledPot2 = this.shuffleArray(pot2Teams);

    const matches: QualifyingMatch[] = [];

    for (let i = 0; i < 8; i++) {
      const teamPot1 = shuffledPot1[i]; // Always firstTeam (from Pot 1)
      const teamPot2 = shuffledPot2[i]; // Always secondTeam (from Pot 2)

      const winnerPlaceholder = this.createWinnerPlaceholder(
        teamPot1,
        teamPot2,
      );

      matches.push({
        id: `phase2-match-${i + 1}`,
        matchNumber: i + 1,
        firstTeam: teamPot1,
        secondTeam: teamPot2,
        winnerPlaceholder,
        stage: 2,
      });
    }

    return matches;
  }

  /**
   * Draw Phase 3: 8 Phase 2 winners -> 4 matches -> 4 qualified to group stage
   */
  private drawPhase3(phase2Matches: QualifyingMatch[]): QualifyingMatch[] {
    // Get winners from Phase 2
    const phase2WinnerPlaceholders = phase2Matches.map(
      (match) => match.winnerPlaceholder,
    );

    // Shuffle winners for random pairing
    const shuffled = this.shuffleArray(phase2WinnerPlaceholders);

    const matches: QualifyingMatch[] = [];

    for (let i = 0; i < 4; i++) {
      const team1 = shuffled[i * 2];
      const team2 = shuffled[i * 2 + 1];

      const winnerPlaceholder = `Qualified to Groups: Winner of ${team1} vs ${team2}`;

      matches.push({
        id: `phase3-match-${i + 1}`,
        matchNumber: i + 1,
        firstTeam: team1,
        secondTeam: team2,
        winnerPlaceholder,
        stage: 3,
      });
    }

    return matches;
  }

  private createTeamDraw(team: ProcessedTeam): TeamDraw {
    return new TeamDraw(
      team.name,
      team.country,
      team.bombo,
      team.isCurrentChampion,
      team.isFromQualifyingStage,
      team.logo,
      team.id,
      team.ranking,
    );
  }

  private createWinnerPlaceholder(
    firstTeam: TeamDraw | string,
    secondTeam: TeamDraw | string,
  ): string {
    const firstName =
      typeof firstTeam === 'string'
        ? firstTeam
        : this.toTitleCase(firstTeam.name);
    const secondName =
      typeof secondTeam === 'string'
        ? secondTeam
        : this.toTitleCase(secondTeam.name);
    return `Winner of ${firstName} vs ${secondName}`;
  }

  private toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );
  }
}
