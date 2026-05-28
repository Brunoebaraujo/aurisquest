type SideQuestDateRow = {
  family_id?: string
  child_id: string
  quest_date: string
}

const pad = (value: number) => String(value).padStart(2, "0")

export const getTodayQuestDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())

  return `${year}-${month}-${day}`
}

export const getBlockedChildIdsForQuestDate = (
  sideQuests: SideQuestDateRow[],
  questDate: string,
) => new Set(sideQuests.filter(row => row.quest_date === questDate).map(row => row.child_id))

export const canCreateSideQuestForChild = (
  sideQuests: SideQuestDateRow[],
  childId: string,
  questDate: string,
  familyId?: string,
) => !sideQuests.some(row => {
  const sameFamily = !familyId || !row.family_id || row.family_id === familyId
  return sameFamily && row.child_id === childId && row.quest_date === questDate
})

export const childDashboardMatchesBlockedSideQuest = (
  blockedSideQuest: SideQuestDateRow,
  dashboardSideQuest: SideQuestDateRow | null,
) => !!dashboardSideQuest
  && blockedSideQuest.child_id === dashboardSideQuest.child_id
  && blockedSideQuest.quest_date === dashboardSideQuest.quest_date
  && (!blockedSideQuest.family_id || !dashboardSideQuest.family_id || blockedSideQuest.family_id === dashboardSideQuest.family_id)
