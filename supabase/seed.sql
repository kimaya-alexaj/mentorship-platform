-- Seed data for local development: skills taxonomy (5 categories, 6
-- skills each = 30 skills). Idempotent so `supabase db reset` can run it
-- repeatedly.

insert into public.skill_categories (name, slug) values
  ('Technology & Programming', 'technology-programming'),
  ('Business & Career', 'business-career'),
  ('Creative Arts', 'creative-arts'),
  ('Health & Wellbeing', 'health-wellbeing'),
  ('Life & Personal Development', 'life-personal-development')
on conflict (slug) do nothing;

insert into public.skills (category_id, name, slug, synonyms)
select c.id, s.name, s.slug, s.synonyms
from (values
  ('technology-programming', 'JavaScript', 'javascript', array['JS', 'ECMAScript']),
  ('technology-programming', 'Python', 'python', array[]::text[]),
  ('technology-programming', 'Web Development', 'web-development', array['Frontend Development', 'Web Dev']),
  ('technology-programming', 'Data Analysis', 'data-analysis', array['Data Analytics']),
  ('technology-programming', 'Cybersecurity', 'cybersecurity', array['InfoSec', 'Information Security']),
  ('technology-programming', 'Mobile App Development', 'mobile-app-development', array['iOS Development', 'Android Development', 'App Dev']),

  ('business-career', 'Resume Writing', 'resume-writing', array['CV Writing']),
  ('business-career', 'Interview Preparation', 'interview-preparation', array['Interview Coaching']),
  ('business-career', 'Public Speaking', 'public-speaking', array['Presentation Skills']),
  ('business-career', 'Entrepreneurship', 'entrepreneurship', array['Starting a Business', 'Startups']),
  ('business-career', 'Project Management', 'project-management', array['PM']),
  ('business-career', 'Marketing', 'marketing', array['Digital Marketing']),

  ('creative-arts', 'Creative Writing', 'creative-writing', array['Fiction Writing', 'Storytelling']),
  ('creative-arts', 'Graphic Design', 'graphic-design', array['Visual Design']),
  ('creative-arts', 'Photography', 'photography', array[]::text[]),
  ('creative-arts', 'Music Production', 'music-production', array['Beat Making', 'Audio Production']),
  ('creative-arts', 'Painting & Drawing', 'painting-drawing', array['Illustration', 'Fine Art']),
  ('creative-arts', 'Filmmaking', 'filmmaking', array['Video Production']),

  ('health-wellbeing', 'Nutrition Basics', 'nutrition-basics', array['Healthy Eating']),
  ('health-wellbeing', 'Fitness Coaching', 'fitness-coaching', array['Personal Training']),
  ('health-wellbeing', 'Mental Health Support', 'mental-health-support', array['Wellbeing', 'Emotional Support']),
  ('health-wellbeing', 'Mindfulness & Meditation', 'mindfulness-meditation', array['Meditation']),
  ('health-wellbeing', 'Sleep Habits', 'sleep-habits', array['Sleep Hygiene']),
  ('health-wellbeing', 'Stress Management', 'stress-management', array[]::text[]),

  ('life-personal-development', 'Time Management', 'time-management', array['Productivity']),
  ('life-personal-development', 'Financial Literacy', 'financial-literacy', array['Budgeting', 'Personal Finance']),
  ('life-personal-development', 'Language Learning', 'language-learning', array[]::text[]),
  ('life-personal-development', 'Study Skills', 'study-skills', array['Exam Preparation']),
  ('life-personal-development', 'Career Change Guidance', 'career-change-guidance', array['Career Transition']),
  ('life-personal-development', 'Confidence Building', 'confidence-building', array['Self-Esteem'])
) as s(category_slug, name, slug, synonyms)
join public.skill_categories c on c.slug = s.category_slug
on conflict (slug) do nothing;
