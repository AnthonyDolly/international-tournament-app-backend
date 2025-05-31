import { Injectable, BadRequestException } from '@nestjs/common';
import { TeamDraw } from '../entities/team-draw.entity';
import {
  TOURNAMENT_CONSTANTS,
  GROUP_LABELS,
} from '../constants/tournament.constants';

export interface GroupStageResult {
  groups: Array<{
    group: string;
    teams: Array<{
      id: string;
      name: string;
      country: string;
      bombo: number;
      logo: string | null;
      isCurrentChampion: boolean;
      isFromQualifyingStage: boolean;
    }>;
  }>;
}

@Injectable()
export class GroupStageDrawService {
  /**
   * Generates a group stage draw for 32 teams
   */
  generateDraw(teams: any[]): GroupStageResult {
    this.validateTeamsCount(teams);

    const drawTeams = this.mapTeamsToDrawEntities(teams);
    const groups = this.performDraw(drawTeams);

    if (!groups) {
      throw new BadRequestException(
        'Could not generate a valid group stage draw',
      );
    }

    return this.formatDrawResult(groups);
  }

  private validateTeamsCount(teams: any[]): void {
    if (teams.length !== TOURNAMENT_CONSTANTS.REQUIRED_TEAMS_FOR_GROUP_STAGE) {
      throw new BadRequestException(
        `Tournament must have exactly ${TOURNAMENT_CONSTANTS.REQUIRED_TEAMS_FOR_GROUP_STAGE} teams for the group stage draw`,
      );
    }
  }

  private mapTeamsToDrawEntities(tournamentTeams: any[]): TeamDraw[] {
    return tournamentTeams.map((teamEntry) => {
      const teamData = teamEntry.teamId as any;
      return new TeamDraw(
        teamData.name,
        teamData.country,
        teamData.bombo,
        teamData.isCurrentChampion || false,
        teamData.isFromQualifyingStage || false,
        teamData.logo,
        teamEntry._id.toString(),
      );
    });
  }

  private formatDrawResult(groups: TeamDraw[][]): GroupStageResult {
    return {
      groups: groups.map((group, index) => ({
        group: GROUP_LABELS[index],
        teams: group.map((team) => ({
          id: team.originalId,
          name: team.name,
          country: team.country,
          bombo: team.bombo,
          logo: team.logo ? `http://localhost:3000/uploads/${team.logo}` : null,
          isCurrentChampion: team.isCurrentChampion,
          isFromQualifyingStage: team.isFromQualifyingStage,
        })),
      })),
    };
  }

  private performDraw(teams: TeamDraw[]): TeamDraw[][] | null {
    for (
      let attempt = 0;
      attempt < TOURNAMENT_CONSTANTS.MAX_DRAW_ATTEMPTS;
      attempt++
    ) {
      const result = this.assignTeamsToGroups(teams);
      if (result) {
        return result.map((group) =>
          [...group].sort((a, b) => a.bombo - b.bombo),
        );
      }

      if (attempt % TOURNAMENT_CONSTANTS.LOG_INTERVAL === 0) {
        console.log(
          `Attempt ${attempt + 1}: Searching for valid distribution...`,
        );
      }
    }
    return null;
  }

  private assignTeamsToGroups(teams: TeamDraw[]): TeamDraw[][] | null {
    const sortedTeams = this.sortTeamsByConstraints(teams);
    const champion = this.extractChampion(sortedTeams);

    const groups = this.initializeGroups();
    const bombosPerGroup = this.initializeBombosPerGroup();

    // Assign champion to Group A
    if (champion) {
      groups[0].push(champion);
      bombosPerGroup[0].add(champion.bombo);
    }

    const remainingTeams = [...sortedTeams];
    this.shuffleArray(remainingTeams);

    return this.assignRemainingTeams(remainingTeams, groups, bombosPerGroup);
  }

  private sortTeamsByConstraints(teams: TeamDraw[]): TeamDraw[] {
    const nonQualifierTeams = teams.filter((team) => !team.isFromQualifyingStage);
    const countryCount = this.countOccurrences(
      nonQualifierTeams.map((team) => team.country),
    );

    return [...teams].sort((a, b) => {
      // Champion first
      if (a.isCurrentChampion !== b.isCurrentChampion) {
        return b.isCurrentChampion ? 1 : -1;
      }

      // More country restrictions first (if not from qualifiers)
      const countA = a.isFromQualifyingStage
        ? 0
        : countryCount.get(a.country) || 0;
      const countB = b.isFromQualifyingStage
        ? 0
        : countryCount.get(b.country) || 0;

      if (countA !== countB) {
        return countB - countA;
      }

      // Higher bombo first
      return b.bombo - a.bombo;
    });
  }

  private extractChampion(teams: TeamDraw[]): TeamDraw | null {
    const championIndex = teams.findIndex((team) => team.isCurrentChampion);
    if (championIndex === -1) return null;

    const champion = teams[championIndex];
    teams.splice(championIndex, 1);
    return champion;
  }

  private initializeGroups(): TeamDraw[][] {
    return Array(TOURNAMENT_CONSTANTS.NUMBER_OF_GROUPS)
      .fill(null)
      .map(() => []);
  }

  private initializeBombosPerGroup(): Set<number>[] {
    return Array(TOURNAMENT_CONSTANTS.NUMBER_OF_GROUPS)
      .fill(null)
      .map(() => new Set<number>());
  }

  private assignRemainingTeams(
    teams: TeamDraw[],
    groups: TeamDraw[][],
    bombosPerGroup: Set<number>[],
  ): TeamDraw[][] | null {
    const unassignedTeams = [...teams];
    let attempts = 0;

    while (
      unassignedTeams.length > 0 &&
      attempts < TOURNAMENT_CONSTANTS.MAX_ASSIGNMENT_ATTEMPTS
    ) {
      attempts++;

      const team = unassignedTeams[0];
      const validGroups = this.findValidGroups(team, groups, bombosPerGroup);

      if (validGroups.length === 0) {
        return null; // No valid groups, restart
      }

      // Assign to random valid group
      const groupIndex =
        validGroups[Math.floor(Math.random() * validGroups.length)];
      groups[groupIndex].push(team);
      bombosPerGroup[groupIndex].add(team.bombo);
      unassignedTeams.splice(0, 1);
    }

    return this.isValidAssignment(unassignedTeams, groups) ? groups : null;
  }

  private findValidGroups(
    team: TeamDraw,
    groups: TeamDraw[][],
    bombosPerGroup: Set<number>[],
  ): number[] {
    const validGroups: number[] = [];

    for (let i = 0; i < TOURNAMENT_CONSTANTS.NUMBER_OF_GROUPS; i++) {
      if (
        groups[i].length < TOURNAMENT_CONSTANTS.TEAMS_PER_GROUP &&
        this.isValidPlacement(groups[i], team, bombosPerGroup[i])
      ) {
        validGroups.push(i);
      }
    }

    return validGroups;
  }

  private isValidPlacement(
    group: TeamDraw[],
    team: TeamDraw,
    usedBombos: Set<number>,
  ): boolean {
    // Check bombo restriction
    if (usedBombos.has(team.bombo)) {
      return false;
    }

    // Check country restriction
    for (const existingTeam of group) {
      // If either team is from qualifiers, ignore country restriction
      if (
        existingTeam.country === team.country &&
        !(existingTeam.isFromQualifyingStage || team.isFromQualifyingStage)
      ) {
        return false;
      }
    }

    return true;
  }

  private isValidAssignment(
    unassignedTeams: TeamDraw[],
    groups: TeamDraw[][],
  ): boolean {
    return (
      unassignedTeams.length === 0 &&
      groups.every(
        (group) => group.length === TOURNAMENT_CONSTANTS.TEAMS_PER_GROUP,
      )
    );
  }

  private countOccurrences<T>(items: T[]): Map<T, number> {
    const counter = new Map<T, number>();
    for (const item of items) {
      counter.set(item, (counter.get(item) || 0) + 1);
    }
    return counter;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
