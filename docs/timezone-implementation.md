# Timezone Implementation - Indian Standard Time (IST)

## Overview
All user-facing times in the application are now displayed in **Indian Standard Time (IST, UTC+5:30)**. The backend continues to store and process all times in UTC for consistency and reliability.

## Key Changes

### 1. New Utility File
**Location:** `client/src/lib/timezone-utils.ts`

This file contains helper functions for timezone conversion:
- `utcToISTDateString()` - Convert UTC to IST date (YYYY-MM-DD)
- `utcToISTTimeString()` - Convert UTC to IST time (HH:MM)
- `utcToISTDisplay()` - Convert UTC to full IST display format
- `istToUTC()` - Convert IST date/time to UTC ISO string
- `getCurrentISTDate()` - Get current date in IST
- `formatTimeSlot()` - Format time in 12-hour format
- `isISTDateTimePast()` - Check if an IST date/time is in the past
- `formatISTDate()` - Format dates for display

### 2. Updated Components

#### **AppointmentBooking.tsx**
- Shows timezone notice: "All times shown are in Indian Standard Time (IST)"
- Converts IST selection to UTC before sending to backend
- Displays available dates and times in IST
- Uses `istToUTC()` when creating appointments

#### **AvailabilityManager.tsx**
- Shows timezone notice in availability manager
- Generates next 7 days based on IST dates
- All time selections are in IST
- Displays IST times throughout the interface

#### **AppointmentCard.tsx**
- Converts UTC appointment times to IST for display
- Shows "IST" label next to times for clarity
- All displayed times are in IST format

### 3. Backend (No Changes Required)
The backend continues to:
- Store all dates/times in UTC in the database
- Process and validate times in UTC
- Return UTC times in API responses

This approach ensures:
- Consistency across different timezones
- Proper handling of daylight saving time (if applicable in the future)
- Easy integration with users in other countries (if needed later)

## How It Works

### Booking Flow
1. **Doctor sets availability** (in IST):
   - Doctor selects time like "09:00 AM - 05:00 PM" in IST
   - Frontend sends these times to backend
   - Backend stores in database (times are treated as UTC-based)

2. **Patient views availability** (in IST):
   - Backend returns available slots
   - Frontend displays times in IST format
   - Patient sees familiar IST times

3. **Patient books appointment** (in IST):
   - Patient selects date and time (e.g., "8:45 PM IST")
   - Frontend converts to UTC using `istToUTC()` before sending
   - Backend validates against UTC time
   - Prevents booking in the past based on UTC comparison

4. **Viewing appointments** (in IST):
   - Backend returns UTC timestamps
   - Frontend converts to IST for display using `utcToISTDisplay()`
   - All times shown with "IST" label for clarity

## Example Conversions

### IST to UTC
- IST: 2025-11-08 20:45 (8:45 PM)
- UTC: 2025-11-08 15:15 (3:15 PM)
- Difference: IST is UTC+5:30

### UTC to IST
- UTC: 2025-11-08 10:00 (10:00 AM)
- IST: 2025-11-08 15:30 (3:30 PM)

## Testing

### To Test Timezone Handling:

1. **Set Doctor Availability:**
   - Login as doctor
   - Go to Availability Manager
   - Notice the IST timezone banner
   - Set hours (e.g., 9:00 AM - 5:00 PM)
   - These times are in IST

2. **Book Appointment:**
   - Login as patient in different browser
   - View doctor's availability
   - Notice the IST timezone banner
   - Select a time slot
   - The time shown is in IST

3. **Verify Times:**
   - Check appointment details
   - All times should show "IST" label
   - Times should match what was selected

4. **Test Past Time Validation:**
   - Try booking a time that has passed in IST
   - Should get error: "Appointments cannot be scheduled in the past"
   - Backend validates against UTC current time

## Troubleshooting

### "Appointments cannot be scheduled in the past" Error

**Cause:** The selected IST time has already passed when converted to UTC.

**Solution:** 
- Always select a future time (at least 5-10 minutes ahead)
- The system uses current UTC time for validation
- IST times are converted to UTC before validation

### Times Showing Incorrectly

**Check:**
1. System clock is correct
2. Browser timezone settings
3. The "IST" label is displayed next to times
4. Compare UTC and IST times using the utility functions

## Benefits

1. **User-Friendly:** Users see times in familiar IST format
2. **Accurate:** Backend stores in UTC, avoiding timezone confusion
3. **Scalable:** Easy to add support for other timezones in the future
4. **Consistent:** All time conversions use the same utility functions
5. **Clear:** IST labels make it obvious which timezone is being used

## Future Enhancements

Potential improvements for future versions:
- Auto-detect user's timezone
- Support multiple timezone displays
- Show appointments in user's local timezone
- Add timezone selection in user profile
- Display timezone abbreviations (IST, UTC, etc.)

## Technical Notes

- Uses native JavaScript `Intl` API (no external dependencies)
- IST timezone identifier: `Asia/Kolkata`
- UTC offset: +5:30 (330 minutes)
- No daylight saving time in IST
- All conversions are done client-side
- Backend remains timezone-agnostic (UTC only)
