// Prefix TeamList gives a newly created team until the save succeeds
export const UNSAVED_TEAM_ID_PREFIX = 'temp-';

export const isUnsavedTeamId = (id: string): boolean =>
  id.startsWith(UNSAVED_TEAM_ID_PREFIX);
