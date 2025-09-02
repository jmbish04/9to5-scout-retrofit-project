-- This script populates the skills-related tables in the user_profile_schema.
-- It is designed to be run once to set up the initial skills data.
-- Assumes a user_profile record with id 'justin_bishop_main' already exists.

-- Step 1: Insert the skill categories from the resume template.
INSERT INTO skill_categories (id, name) VALUES
('cat_prod_mgmt', 'Product & Program Management'),
('cat_strat_ops', 'Strategic Operations & Analytics'),
('cat_tech', 'Technical Proficiencies');

-- Step 2: Insert the individual skills for each category.

-- Product & Program Management Skills
INSERT INTO skills (id, name, category_id) VALUES
('skill_prod_vision', 'Product Vision & Strategy', 'cat_prod_mgmt'),
('skill_tech_roadmap', 'Technical Roadmapping', 'cat_prod_mgmt'),
('skill_user_advocacy', 'User Advocacy & Trust', 'cat_prod_mgmt'),
('skill_agile', 'Agile Methodologies', 'cat_prod_mgmt'),
('skill_mvp', 'MVP Development', 'cat_prod_mgmt'),
('skill_data_driven', 'Data-Driven Decisions', 'cat_prod_mgmt'),
('skill_cross_func', 'Cross-Functional Leadership', 'cat_prod_mgmt'),
('skill_influence', 'Strategic Influence', 'cat_prod_mgmt'),
('skill_scaling', 'Scalable Automation', 'cat_prod_mgmt'),
('skill_iterative_dev', 'Rapid Iterative Development', 'cat_prod_mgmt');

-- Strategic Operations & Analytics Skills
INSERT INTO skills (id, name, category_id) VALUES
('skill_kpi', 'KPI Architecture', 'cat_strat_ops'),
('skill_predictive', 'Predictive Analytics', 'cat_strat_ops'),
('skill_vertex_ai', 'Vertex AI', 'cat_strat_ops'),
('skill_bqml', 'BigQuery ML', 'cat_strat_ops'),
('skill_etl', 'ETL Pipelines', 'cat_strat_ops'),
('skill_workflow_auto', 'Workflow Automation', 'cat_strat_ops'),
('skill_bi', 'Business Intelligence', 'cat_strat_ops');

-- Technical Proficiencies
INSERT INTO skills (id, name, category_id) VALUES
('skill_sql', 'SQL', 'cat_tech'),
('skill_python', 'Python', 'cat_tech'),
('skill_js_ts', 'JavaScript / TypeScript', 'cat_tech'),
('skill_apps_script', 'Apps Script', 'cat_tech'),
('skill_gcp', 'GCP', 'cat_tech'),
('skill_cf_workers', 'Cloudflare Workers', 'cat_tech'),
('skill_tableau', 'Tableau', 'cat_tech');

-- Step 3: Link all the newly created skills to your main profile.
-- This assumes your main profile record has an id of 'justin_bishop_main'.
INSERT INTO profile_skills (profile_id, skill_id) VALUES
('justin_bishop_main', 'skill_prod_vision'),
('justin_bishop_main', 'skill_tech_roadmap'),
('justin_bishop_main', 'skill_user_advocacy'),
('justin_bishop_main', 'skill_agile'),
('justin_bishop_main', 'skill_mvp'),
('justin_bishop_main', 'skill_data_driven'),
('justin_bishop_main', 'skill_cross_func'),
('justin_bishop_main', 'skill_influence'),
('justin_bishop_main', 'skill_scaling'),
('justin_bishop_main', 'skill_iterative_dev'),
('justin_bishop_main', 'skill_kpi'),
('justin_bishop_main', 'skill_predictive'),
('justin_bishop_main', 'skill_vertex_ai'),
('justin_bishop_main', 'skill_bqml'),
('justin_bishop_main', 'skill_etl'),
('justin_bishop_main', 'skill_workflow_auto'),
('justin_bishop_main', 'skill_bi'),
('justin_bishop_main', 'skill_sql'),
('justin_bishop_main', 'skill_python'),
('justin_bishop_main', 'skill_js_ts'),
('justin_bishop_main', 'skill_apps_script'),
('justin_bishop_main', 'skill_gcp'),
('justin_bishop_main', 'skill_cf_workers'),
('justin_bishop_main', 'skill_tableau');
