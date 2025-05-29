import { KnockoutHelper } from '../knockout.helper';
import {
  GroupClassificationTeam,
  GroupWithTeams,
} from '../../interfaces/knockout.interface';
import { KNOCKOUT_CONSTANTS } from '../../constants/knockout.constants';

describe('KnockoutHelper', () => {
  const mockTeams: GroupClassificationTeam[] = [
    {
      tournamentTeamId: '1',
      id: 'team1',
      name: 'Team A',
      logo: null,
      matchesPlayed: 3,
      wins: 3,
      draws: 0,
      losses: 0,
      goalsFor: 6,
      goalsAgainst: 1,
      goalDifference: 5,
      points: 9,
    },
    {
      tournamentTeamId: '2',
      id: 'team2',
      name: 'Team B',
      logo: null,
      matchesPlayed: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      goalsFor: 4,
      goalsAgainst: 3,
      goalDifference: 1,
      points: 6,
    },
    {
      tournamentTeamId: '3',
      id: 'team3',
      name: 'Team C',
      logo: null,
      matchesPlayed: 3,
      wins: 1,
      draws: 0,
      losses: 2,
      goalsFor: 3,
      goalsAgainst: 4,
      goalDifference: -1,
      points: 3,
    },
  ];

  const mockGroups: GroupWithTeams[] = [
    {
      group: { id: 'group1', name: 'Group A' },
      teams: mockTeams,
    },
    {
      group: { id: 'group2', name: 'Group B' },
      teams: [...mockTeams].reverse(), // Different order
    },
  ];

  describe('sortTeamsByRanking', () => {
    it('should sort teams by points descending', () => {
      const unsortedTeams = [...mockTeams].reverse();
      const sorted = KnockoutHelper.sortTeamsByRanking(unsortedTeams);

      expect(sorted[0].points).toBe(9);
      expect(sorted[1].points).toBe(6);
      expect(sorted[2].points).toBe(3);
    });

    it('should use goal difference as tiebreaker when points are equal', () => {
      const teamsWithSamePoints: GroupClassificationTeam[] = [
        { ...mockTeams[1], points: 6, goalDifference: 2 },
        { ...mockTeams[2], points: 6, goalDifference: 1 },
      ];

      const sorted = KnockoutHelper.sortTeamsByRanking(teamsWithSamePoints);

      expect(sorted[0].goalDifference).toBe(2);
      expect(sorted[1].goalDifference).toBe(1);
    });

    it('should use goals for as final tiebreaker', () => {
      const teamsWithSamePointsAndDifference: GroupClassificationTeam[] = [
        { ...mockTeams[1], points: 6, goalDifference: 1, goalsFor: 5 },
        { ...mockTeams[2], points: 6, goalDifference: 1, goalsFor: 3 },
      ];

      const sorted = KnockoutHelper.sortTeamsByRanking(
        teamsWithSamePointsAndDifference,
      );

      expect(sorted[0].goalsFor).toBe(5);
      expect(sorted[1].goalsFor).toBe(3);
    });
  });

  describe('extractQualifiedTeams', () => {
    it('should extract first and second place teams from each group', () => {
      const { firstPlaceTeams, secondPlaceTeams } =
        KnockoutHelper.extractQualifiedTeams(mockGroups);

      expect(firstPlaceTeams).toHaveLength(2);
      expect(secondPlaceTeams).toHaveLength(2);

      // Check first place teams
      expect(firstPlaceTeams[0].position).toBe(
        KNOCKOUT_CONSTANTS.POSITIONS.FIRST,
      );
      expect(firstPlaceTeams[0].groupName).toBe('Group A');

      // Check second place teams
      expect(secondPlaceTeams[0].position).toBe(
        KNOCKOUT_CONSTANTS.POSITIONS.SECOND,
      );
      expect(secondPlaceTeams[0].groupName).toBe('Group A');
    });
  });

  describe('createRandomKnockoutMatchups', () => {
    const firstTeams = [
      {
        id: '1',
        name: 'First A',
        logo: null,
        groupName: 'A',
        position: 1,
        tournamentTeamId: '1',
      },
      {
        id: '3',
        name: 'First B',
        logo: null,
        groupName: 'B',
        position: 1,
        tournamentTeamId: '3',
      },
    ];

    const secondTeams = [
      {
        id: '2',
        name: 'Second A',
        logo: null,
        groupName: 'A',
        position: 2,
        tournamentTeamId: '2',
      },
      {
        id: '4',
        name: 'Second B',
        logo: null,
        groupName: 'B',
        position: 2,
        tournamentTeamId: '4',
      },
    ];

    it('should create the correct number of matchups', () => {
      const matchups = KnockoutHelper.createRandomKnockoutMatchups(
        firstTeams,
        secondTeams,
      );

      expect(matchups).toHaveLength(2);
    });

    it('should generate unique matchup IDs', () => {
      const matchups = KnockoutHelper.createRandomKnockoutMatchups(
        firstTeams,
        secondTeams,
      );
      const ids = matchups.map((m) => m.matchupId);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should pair first place teams with second place teams', () => {
      const matchups = KnockoutHelper.createRandomKnockoutMatchups(
        firstTeams,
        secondTeams,
      );

      matchups.forEach((matchup) => {
        expect(matchup.firstPlaceTeam.position).toBe(1);
        expect(matchup.secondPlaceTeam.position).toBe(2);
      });
    });
  });

  describe('validateGroupsForKnockout', () => {
    it('should not throw when all groups have enough teams', () => {
      expect(() =>
        KnockoutHelper.validateGroupsForKnockout(mockGroups),
      ).not.toThrow();
    });

    it('should throw when a group has insufficient teams', () => {
      const invalidGroups: GroupWithTeams[] = [
        {
          group: { id: 'group1', name: 'Group A' },
          teams: [mockTeams[0]], // Only one team
        },
      ];

      expect(() =>
        KnockoutHelper.validateGroupsForKnockout(invalidGroups),
      ).toThrow(
        "Some groups don't have enough teams for knockout phase: Group A",
      );
    });
  });

  describe('validateTeamBalance', () => {
    const firstTeams = [
      {
        id: '1',
        name: 'First A',
        logo: null,
        groupName: 'A',
        position: 1,
        tournamentTeamId: '1',
      },
    ];

    const secondTeams = [
      {
        id: '2',
        name: 'Second A',
        logo: null,
        groupName: 'A',
        position: 2,
        tournamentTeamId: '2',
      },
    ];

    it('should not throw when teams are balanced', () => {
      expect(() =>
        KnockoutHelper.validateTeamBalance(firstTeams, secondTeams),
      ).not.toThrow();
    });

    it('should throw when teams are unbalanced', () => {
      const unevenSecondTeams = [...secondTeams, ...secondTeams]; // Double the second teams

      expect(() =>
        KnockoutHelper.validateTeamBalance(firstTeams, unevenSecondTeams),
      ).toThrow(
        'Uneven number of first and second place teams for knockout draw',
      );
    });
  });

  describe('createCompleteBracket', () => {
    const mockRoundOf16Matchups = [
      {
        matchupId: 'R16_1',
        firstPlaceTeam: {
          id: '1',
          name: 'Team 1',
          logo: null,
          groupName: 'A',
          position: 1,
          tournamentTeamId: '1',
        },
        secondPlaceTeam: {
          id: '2',
          name: 'Team 2',
          logo: null,
          groupName: 'B',
          position: 2,
          tournamentTeamId: '2',
        },
      },
      {
        matchupId: 'R16_2',
        firstPlaceTeam: {
          id: '3',
          name: 'Team 3',
          logo: null,
          groupName: 'C',
          position: 1,
          tournamentTeamId: '3',
        },
        secondPlaceTeam: {
          id: '4',
          name: 'Team 4',
          logo: null,
          groupName: 'D',
          position: 2,
          tournamentTeamId: '4',
        },
      },
      {
        matchupId: 'R16_3',
        firstPlaceTeam: {
          id: '5',
          name: 'Team 5',
          logo: null,
          groupName: 'E',
          position: 1,
          tournamentTeamId: '5',
        },
        secondPlaceTeam: {
          id: '6',
          name: 'Team 6',
          logo: null,
          groupName: 'F',
          position: 2,
          tournamentTeamId: '6',
        },
      },
      {
        matchupId: 'R16_4',
        firstPlaceTeam: {
          id: '7',
          name: 'Team 7',
          logo: null,
          groupName: 'G',
          position: 1,
          tournamentTeamId: '7',
        },
        secondPlaceTeam: {
          id: '8',
          name: 'Team 8',
          logo: null,
          groupName: 'H',
          position: 2,
          tournamentTeamId: '8',
        },
      },
      {
        matchupId: 'R16_5',
        firstPlaceTeam: {
          id: '9',
          name: 'Team 9',
          logo: null,
          groupName: 'A',
          position: 1,
          tournamentTeamId: '9',
        },
        secondPlaceTeam: {
          id: '10',
          name: 'Team 10',
          logo: null,
          groupName: 'B',
          position: 2,
          tournamentTeamId: '10',
        },
      },
      {
        matchupId: 'R16_6',
        firstPlaceTeam: {
          id: '11',
          name: 'Team 11',
          logo: null,
          groupName: 'C',
          position: 1,
          tournamentTeamId: '11',
        },
        secondPlaceTeam: {
          id: '12',
          name: 'Team 12',
          logo: null,
          groupName: 'D',
          position: 2,
          tournamentTeamId: '12',
        },
      },
      {
        matchupId: 'R16_7',
        firstPlaceTeam: {
          id: '13',
          name: 'Team 13',
          logo: null,
          groupName: 'E',
          position: 1,
          tournamentTeamId: '13',
        },
        secondPlaceTeam: {
          id: '14',
          name: 'Team 14',
          logo: null,
          groupName: 'F',
          position: 2,
          tournamentTeamId: '14',
        },
      },
      {
        matchupId: 'R16_8',
        firstPlaceTeam: {
          id: '15',
          name: 'Team 15',
          logo: null,
          groupName: 'G',
          position: 1,
          tournamentTeamId: '15',
        },
        secondPlaceTeam: {
          id: '16',
          name: 'Team 16',
          logo: null,
          groupName: 'H',
          position: 2,
          tournamentTeamId: '16',
        },
      },
    ];

    it('should create complete bracket with all rounds', () => {
      const bracket = KnockoutHelper.createCompleteBracket(
        mockRoundOf16Matchups,
        'tournament-1',
      );

      expect(bracket.tournamentId).toBe('tournament-1');
      expect(bracket.rounds).toHaveLength(4);

      // Check round names
      expect(bracket.rounds[0].round).toBe(
        KNOCKOUT_CONSTANTS.ROUNDS.ROUND_OF_16,
      );
      expect(bracket.rounds[1].round).toBe(
        KNOCKOUT_CONSTANTS.ROUNDS.QUARTER_FINALS,
      );
      expect(bracket.rounds[2].round).toBe(
        KNOCKOUT_CONSTANTS.ROUNDS.SEMI_FINALS,
      );
      expect(bracket.rounds[3].round).toBe(KNOCKOUT_CONSTANTS.ROUNDS.FINAL);
    });

    it('should create correct number of matchups for each round', () => {
      const bracket = KnockoutHelper.createCompleteBracket(
        mockRoundOf16Matchups,
        'tournament-1',
      );

      expect(bracket.rounds[0].matchups).toHaveLength(8); // Round of 16
      expect(bracket.rounds[1].matchups).toHaveLength(4); // Quarterfinals
      expect(bracket.rounds[2].matchups).toHaveLength(2); // Semifinals
      expect(bracket.rounds[3].matchups).toHaveLength(1); // Final
    });

    it('should have correct matchup IDs for each round', () => {
      const bracket = KnockoutHelper.createCompleteBracket(
        mockRoundOf16Matchups,
        'tournament-1',
      );

      // Check quarterfinal IDs
      const qfMatchups = bracket.rounds[1].matchups as any[];
      expect(qfMatchups[0].matchupId).toBe('QF_1');
      expect(qfMatchups[1].matchupId).toBe('QF_2');
      expect(qfMatchups[2].matchupId).toBe('QF_3');
      expect(qfMatchups[3].matchupId).toBe('QF_4');

      // Check semifinal IDs
      const sfMatchups = bracket.rounds[2].matchups as any[];
      expect(sfMatchups[0].matchupId).toBe('SF_1');
      expect(sfMatchups[1].matchupId).toBe('SF_2');

      // Check final ID
      const finalMatchup = bracket.rounds[3].matchups[0] as any;
      expect(finalMatchup.matchupId).toBe('F');
    });

    it('should create correct bracket structure', () => {
      const bracket = KnockoutHelper.createCompleteBracket(
        mockRoundOf16Matchups,
        'tournament-1',
      );

      // Check quarterfinal references
      const qfMatchups = bracket.rounds[1].matchups as any[];
      expect(qfMatchups[0].from).toEqual(['R16_1', 'R16_2']);
      expect(qfMatchups[1].from).toEqual(['R16_3', 'R16_4']);
      expect(qfMatchups[2].from).toEqual(['R16_5', 'R16_6']);
      expect(qfMatchups[3].from).toEqual(['R16_7', 'R16_8']);

      // Check semifinal references
      const sfMatchups = bracket.rounds[2].matchups as any[];
      expect(sfMatchups[0].from).toEqual(['QF_1', 'QF_2']);
      expect(sfMatchups[1].from).toEqual(['QF_3', 'QF_4']);

      // Check final references
      const finalMatchup = bracket.rounds[3].matchups[0] as any;
      expect(finalMatchup.from).toEqual(['SF_1', 'SF_2']);
    });
  });
});
