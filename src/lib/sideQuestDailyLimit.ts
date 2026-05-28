type SideQuestDateRow = {
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
) => !sideQuests.some(row => row.child_id === childId && row.quest_date === questDate)
