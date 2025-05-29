import {
  GroupClassificationTeam,
  GroupWithTeams,
  KnockoutTeam,
  KnockoutMatchup,
  BracketMatchup,
  TournamentRound,
  CompleteBracketResult,
} from '../interfaces/knockout.interface';
import { KNOCKOUT_CONSTANTS } from '../constants/knockout.constants';

export class KnockoutHelper {
  /**
   * Sorts teams within a group by competition criteria
   */
  static sortTeamsByRanking(
    teams: GroupClassificationTeam[],
  ): GroupClassificationTeam[] {
    return teams.sort((a, b) => {
      // Primary: Points (descending)
      if (b.points !== a.points) return b.points - a.points;

      // Secondary: Goal difference (descending)
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }

      // Tertiary: Goals for (descending)
      return b.goalsFor - a.goalsFor;
    });
  }

  /**
   * Extracts qualified teams from group classifications
   */
  static extractQualifiedTeams(groups: GroupWithTeams[]): {
    firstPlaceTeams: KnockoutTeam[];
    secondPlaceTeams: KnockoutTeam[];
  } {
    const firstPlaceTeams: KnockoutTeam[] = [];
    const secondPlaceTeams: KnockoutTeam[] = [];

    groups.forEach((group) => {
      const sortedTeams = this.sortTeamsByRanking(group.teams);

      if (sortedTeams.length >= 1) {
        firstPlaceTeams.push(
          this.createKnockoutTeam(
            sortedTeams[0],
            group.group.name,
            KNOCKOUT_CONSTANTS.POSITIONS.FIRST,
          ),
        );
      }

      if (sortedTeams.length >= 2) {
        secondPlaceTeams.push(
          this.createKnockoutTeam(
            sortedTeams[1],
            group.group.name,
            KNOCKOUT_CONSTANTS.POSITIONS.SECOND,
          ),
        );
      }
    });

    return { firstPlaceTeams, secondPlaceTeams };
  }

  /**
   * Creates a KnockoutTeam from GroupClassificationTeam
   */
  private static createKnockoutTeam(
    team: GroupClassificationTeam,
    groupName: string,
    position: number,
  ): KnockoutTeam {
    return {
      id: team.id,
      name: team.name,
      logo: team.logo,
      groupName,
      position,
      tournamentTeamId: team.tournamentTeamId,
    };
  }

  /**
   * Creates random knockout matchups between first and second place teams
   */
  static createRandomKnockoutMatchups(
    firstTeams: KnockoutTeam[],
    secondTeams: KnockoutTeam[],
  ): KnockoutMatchup[] {
    const shuffledFirst = this.shuffleArray([...firstTeams]);
    const shuffledSecond = this.shuffleArray([...secondTeams]);

    const matchups: KnockoutMatchup[] = [];

    for (let i = 0; i < shuffledFirst.length; i++) {
      const matchup: KnockoutMatchup = {
        matchupId: `R16_${i + 1}`,
        firstPlaceTeam: shuffledFirst[i],
        secondPlaceTeam: shuffledSecond[i],
      };
      matchups.push(matchup);
    }

    return matchups;
  }

  /**
   * Shuffles an array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Validates if groups have enough teams for knockout phase
   */
  static validateGroupsForKnockout(groups: GroupWithTeams[]): void {
    const invalidGroups = groups.filter(
      (group) => group.teams.length < KNOCKOUT_CONSTANTS.MIN_TEAMS_FOR_KNOCKOUT,
    );

    if (invalidGroups.length > 0) {
      const groupNames = invalidGroups.map((g) => g.group.name).join(', ');
      throw new Error(
        `Some groups don't have enough teams for knockout phase: ${groupNames}`,
      );
    }
  }

  /**
   * Validates if first and second place teams are balanced
   */
  static validateTeamBalance(
    firstTeams: KnockoutTeam[],
    secondTeams: KnockoutTeam[],
  ): void {
    if (firstTeams.length !== secondTeams.length) {
      throw new Error(
        'Uneven number of first and second place teams for knockout draw',
      );
    }
  }

  /**
   * Creates the complete tournament bracket structure from Round of 16 to Final
   */
  static createCompleteBracket(
    roundOf16Matchups: KnockoutMatchup[],
    tournamentId: string,
  ): CompleteBracketResult {
    const rounds: TournamentRound[] = [];

    // Round of 16
    rounds.push({
      round: KNOCKOUT_CONSTANTS.ROUNDS.ROUND_OF_16,
      matchups: roundOf16Matchups,
    });

    // Quarterfinals
    const quarterfinalMatchups =
      this.createQuarterfinalMatchups(roundOf16Matchups);
    rounds.push({
      round: KNOCKOUT_CONSTANTS.ROUNDS.QUARTER_FINALS,
      matchups: quarterfinalMatchups,
    });

    // Semifinals
    const semifinalMatchups =
      this.createSemifinalMatchups(quarterfinalMatchups);
    rounds.push({
      round: KNOCKOUT_CONSTANTS.ROUNDS.SEMI_FINALS,
      matchups: semifinalMatchups,
    });

    // Final
    const finalMatchup = this.createFinalMatchup(semifinalMatchups);
    rounds.push({
      round: KNOCKOUT_CONSTANTS.ROUNDS.FINAL,
      matchups: [finalMatchup],
    });

    return {
      tournamentId,
      rounds,
    };
  }

  /**
   * Creates quarterfinal matchups from Round of 16 results
   */
  private static createQuarterfinalMatchups(
    roundOf16Matchups: KnockoutMatchup[],
  ): BracketMatchup[] {
    const quarterfinals: BracketMatchup[] = [];

    // Group matchups in pairs for quarterfinals
    for (let i = 0; i < roundOf16Matchups.length; i += 2) {
      const match1 = roundOf16Matchups[i];
      const match2 = roundOf16Matchups[i + 1];

      quarterfinals.push({
        matchupId: `QF_${Math.floor(i / 2) + 1}`,
        from: [match1.matchupId, match2.matchupId],
      });
    }

    return quarterfinals;
  }

  /**
   * Creates semifinal matchups from quarterfinal results
   */
  private static createSemifinalMatchups(
    quarterfinalMatchups: BracketMatchup[],
  ): BracketMatchup[] {
    const semifinals: BracketMatchup[] = [];

    // Group quarterfinals in pairs for semifinals
    for (let i = 0; i < quarterfinalMatchups.length; i += 2) {
      const qf1 = quarterfinalMatchups[i];
      const qf2 = quarterfinalMatchups[i + 1];

      semifinals.push({
        matchupId: `SF_${Math.floor(i / 2) + 1}`,
        from: [qf1.matchupId, qf2.matchupId],
      });
    }

    return semifinals;
  }

  /**
   * Creates the final matchup from semifinal results
   */
  private static createFinalMatchup(
    semifinalMatchups: BracketMatchup[],
  ): BracketMatchup {
    return {
      matchupId: 'F',
      from: semifinalMatchups.map((sf) => sf.matchupId),
    };
  }
}
