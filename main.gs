const main = () => {
  setTrigger()

  const MAIN_CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('MAIN_CALENDAR_ID')
  const TODOIST_CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('TODOIST_CALENDAR_ID')

  const now = new Date()
  const mainEvents = CalendarApp.getCalendarById(MAIN_CALENDAR_ID).getEventsForDay(now)
  const todoistEvents = CalendarApp.getCalendarById(TODOIST_CALENDAR_ID).getEventsForDay(now)

  const { message: eventMessage, count: eventCount } = generateEventMessage(mainEvents, now)
  const { message: todoMessage, count: todoCount } = generateEventMessage(todoistEvents, now)

  if (eventCount > 0 || todoCount > 0) {
    const message = `\n本日の予定をお知らせします（https://calendar.google.com/calendar/u/0/r/day）\n\n\`✅ToDo (${todoCount})\`\n${todoMessage}\n\n\`🗓️予定 (${eventCount})\`\n${eventMessage}`
    sendLineNotify(message)
  }
}

// --- Trigger Function ---
const setTrigger = () => {
  deleteAllTriggers()

  const time = new Date()

  time.setDate(time.getDate()+1)
  time.setHours(15)
  time.setMinutes(0)
  time.setSeconds(0)
  ScriptApp.newTrigger('main').timeBased().at(time).create()
}

const deleteAllTriggers = () => {
  const allTriggers = ScriptApp.getProjectTriggers()
  allTriggers.forEach((trigger) => {
    ScriptApp.deleteTrigger(trigger)
  })
}


// ------------------------

const formatEvent = (event, now) => {
  const timeZone = 'JST'
  const dateFormat = 'M/d'
  const dateTimeFormat = 'HH:mm'

  const startDateTime = event.getStartTime()
  const endDateTime = new Date(event.getEndTime().getTime() - 1) // Subtract 1 millisecond to account for Google Calendar's behavior
  const startDate = Utilities.formatDate(startDateTime, timeZone, dateFormat)
  const endDate = Utilities.formatDate(endDateTime, timeZone, dateFormat)
  const todayDate = Utilities.formatDate(now, timeZone, dateFormat)

  if (event.isAllDayEvent()) {
    if (startDate === endDate) {
      return `*All Day* : ${event.getTitle()}`
    } else {
      return `*All Day (${startDate} - ${endDate})* : ${event.getTitle()}`
    }
  } else {
    const adjustedEndDateTime = new Date(endDateTime.getTime() + 1)
    if (startDate === todayDate && startDate === endDate) {
      return `${Utilities.formatDate(startDateTime, timeZone, dateTimeFormat)} - ${Utilities.formatDate(
        adjustedEndDateTime,
        timeZone,
        dateTimeFormat
      )}: ${event.getTitle()}`
    } else {
      return `${Utilities.formatDate(startDateTime, timeZone, dateTimeFormat)} - ${endDate} ${Utilities.formatDate(
        adjustedEndDateTime,
        timeZone,
        dateTimeFormat
      )}: ${event.getTitle()}`
    }
  }
}

const generateEventMessage = (events, now) => {
  let message = ''
  let count = 0

  events.forEach((event, index) => {
    message += formatEvent(event, now) + (index !== events.length - 1 ? '\n' : '')
    count++
  })

  return { message, count }
}

const sendLineNotify = (message) => {
  const LINE_NOTIFY_ENDPOINT = PropertiesService.getScriptProperties().getProperty('LINE_NOTIFY_ENDPOINT')
  const LINE_NOTIFY_PERSONAL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty(
    'LINE_NOTIFY_PERSONAL_ACCESS_TOKEN'
  )

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LINE_NOTIFY_PERSONAL_ACCESS_TOKEN}`,
    },
    payload: {
      message: message,
    },
  }

  UrlFetchApp.fetch(LINE_NOTIFY_ENDPOINT, options)
}