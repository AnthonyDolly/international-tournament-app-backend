import { KnockoutHelper } from '../knockout.helper';
import { GroupClassificationTeam, GroupWithTeams } from '../../interfaces/knockout.interface';
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

      const sorted = KnockoutHelper.sortTeamsByRanking(teamsWithSamePointsAndDifference);

      expect(sorted[0].goalsFor).toBe(5);
      expect(sorted[1].goalsFor).toBe(3);
    });
  });

  describe('extractQualifiedTeams', () => {
    it('should extract first and second place teams from each group', () => {
      const { firstPlaceTeams, secondPlaceTeams } = KnockoutHelper.extractQualifiedTeams(mockGroups);

      expect(firstPlaceTeams).toHaveLength(2);
      expect(secondPlaceTeams).toHaveLength(2);

      // Check first place teams
      expect(firstPlaceTeams[0].position).toBe(KNOCKOUT_CONSTANTS.POSITIONS.FIRST);
      expect(firstPlaceTeams[0].groupName).toBe('Group A');

      // Check second place teams
      expect(secondPlaceTeams[0].position).toBe(KNOCKOUT_CONSTANTS.POSITIONS.SECOND);
      expect(secondPlaceTeams[0].groupName).toBe('Group A');
    });
  });

  describe('createRandomKnockoutMatchups', () => {
    const firstTeams = [
      { id: '1', name: 'First A', logo: null, groupName: 'A', position: 1, tournamentTeamId: '1' },
      { id: '3', name: 'First B', logo: null, groupName: 'B', position: 1, tournamentTeamId: '3' },
    ];

    const secondTeams = [
      { id: '2', name: 'Second A', logo: null, groupName: 'A', position: 2, tournamentTeamId: '2' },
      { id: '4', name: 'Second B', logo: null, groupName: 'B', position: 2, tournamentTeamId: '4' },
    ];

    it('should create the correct number of matchups', () => {
      const matchups = KnockoutHelper.createRandomKnockoutMatchups(firstTeams, secondTeams);

      expect(matchups).toHaveLength(2);
    });

    it('should generate unique matchup IDs', () => {
      const matchups = KnockoutHelper.createRandomKnockoutMatchups(firstTeams, secondTeams);
      const ids = matchups.map(m => m.matchupId);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should pair first place teams with second place teams', () => {
      const matchups = KnockoutHelper.createRandomKnockoutMatchups(firstTeams, secondTeams);

      matchups.forEach(matchup => {
        expect(matchup.firstPlaceTeam.position).toBe(1);
        expect(matchup.secondPlaceTeam.position).toBe(2);
      });
    });
  });

  describe('validateGroupsForKnockout', () => {
    it('should not throw when all groups have enough teams', () => {
      expect(() => KnockoutHelper.validateGroupsForKnockout(mockGroups)).not.toThrow();
    });

    it('should throw when a group has insufficient teams', () => {
      const invalidGroups: GroupWithTeams[] = [
        {
          group: { id: 'group1', name: 'Group A' },
          teams: [mockTeams[0]], // Only one team
        },
      ];

      expect(() => KnockoutHelper.validateGroupsForKnockout(invalidGroups))
        .toThrow('Some groups don\'t have enough teams for knockout phase: Group A');
    });
  });

  describe('validateTeamBalance', () => {
    const firstTeams = [
      { id: '1', name: 'First A', logo: null, groupName: 'A', position: 1, tournamentTeamId: '1' },
    ];

    const secondTeams = [
      { id: '2', name: 'Second A', logo: null, groupName: 'A', position: 2, tournamentTeamId: '2' },
    ];

    it('should not throw when teams are balanced', () => {
      expect(() => KnockoutHelper.validateTeamBalance(firstTeams, secondTeams)).not.toThrow();
    });

    it('should throw when teams are unbalanced', () => {
      const unevenSecondTeams = [...secondTeams, ...secondTeams]; // Double the second teams

      expect(() => KnockoutHelper.validateTeamBalance(firstTeams, unevenSecondTeams))
        .toThrow('Uneven number of first and second place teams for knockout draw');
    });
  });
}); 