const main = () => {
  setTrigger()

//retrieve calendar ids from script properties and store them into constants

  const MAIN_CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('MAIN_CALENDAR_ID')
  const TODOIST_CALENDAR_ID = PropertiesService.getScriptProperties().getProperty('TODOIST_CALENDAR_ID')

// --retrieve today's date--
// Date is a built-in JS object working with dates and times, new Date() creating a Date object storing the current date and time when code is executed

  const now = new Date()

// Using the previous constants, retreieve events for the current tieme

  const mainEvents = CalendarApp.getCalendarById(MAIN_CALENDAR_ID).getEventsForDay(now)
  const todoistEvents = CalendarApp.getCalendarById(TODOIST_CALENDAR_ID).getEventsForDay(now)

// Retrieve location?
// [0]: array, as the getEventsForDay(now) returns an array of events
// mainEvents is an array containing all events that occur on the current day in the specifies calendar
// If no events exist for today, mainEvents will be an empty array [] and trying to access it will return undefined

  const mainLocation = mainEvents[0].getLocation()

// Generate Google Maps link

const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainLocation)}`; 

// Generate event count and message (fuction explained later)

  const { message: eventMessage, count: eventCount } = generateEventMessage(mainEvents, now)
  const { message: todoMessage, count: todoCount } = generateEventMessage(todoistEvents, now)

// If event counts more than 0, send a notification on LINE

  if (eventCount > 0 || todoCount > 0) {
    const message = `\n本日の予定をお知らせします（https://calendar.google.com/calendar/u/0/r/day）\n\n\`✅ToDo (${todoCount})\`\n${todoMessage}\n\n\`🗓️予定 (${eventCount})\`\n${eventMessage}\n${mainLocation}\n${mapsLink}`
    sendLineNotify(message)
  }
}

// --- Trigger Function ---

// Set a trigger

const setTrigger = () => {

  // Delete previous (one-time) trigger
  deleteAllTriggers()

// -- Set next trigger --
  const time = new Date()

// time.getDate(): retrieves current day of month
// +1: increments the day by one
// time.setDate(): update Date to reflect the new day → updates time object to the same time on the next day

  time.setDate(time.getDate()+1)

// Sets the time object to 8AM
// setHours() works for the 24-hour time frmat

  time.setHours(8)
  time.setMinutes(0)
  time.setSeconds(0)

// → time set to 8:00:00 AM tomorrow

// Creates a new trigger for the main function
// timeBased(): specifies the triggger type
// at(time): Set the time when trigger will fire
// create(): Finalize and create trigger

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