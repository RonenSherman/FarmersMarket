-- Reset market_dates table with correct Thursdays
-- Delete all existing market dates
DELETE FROM market_dates;

-- Insert the next 12 Thursdays (correctly calculated)
DO $$
DECLARE
  i INT := 0;
  current_date DATE := CURRENT_DATE;
  next_thursday DATE;
BEGIN
  -- Find the next Thursday
  next_thursday := current_date + ((4 - EXTRACT(DOW FROM current_date) + 7) % 7)::INTEGER;
  
  -- If today is Thursday and before 6:30 PM, start from today
  IF EXTRACT(DOW FROM current_date) = 4 AND CURRENT_TIME < TIME '18:30' THEN
    next_thursday := current_date;
  END IF;
  
  -- Generate 12 Thursdays
  WHILE i < 12 LOOP
    INSERT INTO market_dates (
      date, 
      is_active, 
      start_time, 
      end_time, 
      weather_status, 
      is_special_event, 
      created_at
    ) VALUES (
      next_thursday, 
      TRUE, 
      '15:00:00', 
      '18:30:00', 
      'scheduled', 
      FALSE, 
      NOW()
    );
    
    -- Move to next Thursday (add 7 days)
    next_thursday := next_thursday + INTERVAL '7 days';
    i := i + 1;
  END LOOP;
END $$;

-- Verify the dates are Thursdays
SELECT 
  date,
  EXTRACT(DOW FROM date) as day_of_week,
  CASE 
    WHEN EXTRACT(DOW FROM date) = 4 THEN 'Thursday ✓'
    ELSE 'NOT Thursday ✗'
  END as verification
FROM market_dates 
ORDER BY date; 