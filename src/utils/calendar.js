import ics from 'ics'

/**
 * 导出日历文件
 */
export const exportToCalendar = (
  contractTitle,
  dates,
  contractId
) => {
  return new Promise((resolve, reject) => {
    const events = dates.map((date, index) => ({
      start: formatDateForICS(date.date_value),
      startInputType: 'utc',
      title: `${contractTitle} - ${date.date_type}`,
      description: `合同ID: ${contractId}\n${date.description || ''}`,
      location: '',
      url: '',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: '智能合同管理系统', email: 'system@example.com' },
      attendees: []
    }))

    ics.createEvents(events, (error, value) => {
      if (error) {
        reject(error)
        return
      }
      
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
      resolve(blob)
    })
  })
}

/**
 * 格式化日期为ICS格式
 */
const formatDateForICS = (dateString) => {
  const date = new Date(dateString)
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  ]
}

/**
 * 生成日历文件名
 */
export const generateCalendarFilename = (contractTitle) => {
  const sanitizedTitle = contractTitle.replace(/[^\w\s-]/g, '').trim()
  const date = new Date().toISOString().split('T')[0]
  return `${sanitizedTitle}_${date}.ics`
}