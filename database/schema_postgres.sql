-- PostgreSQL DDL generated from backend/employees/models.py
-- Table names use Django's default naming: <app_label>_<ModelName lowercased>
-- PKs use BIGSERIAL (Django's BigAutoField), FKs use BIGINT. JSON fields use JSONB; binary uses BYTEA.

BEGIN;

CREATE TABLE IF NOT EXISTS employees_hub (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Quezon',
    company VARCHAR(100) NOT NULL DEFAULT 'J&T Express',
    address VARCHAR(200) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    employee_count INTEGER NOT NULL DEFAULT 0,
    sss_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    philhealth_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    pagibig_rate NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employees_employee (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    middle_initial VARCHAR(10) NOT NULL DEFAULT '',
    place_of_birth VARCHAR(100) NOT NULL DEFAULT '',
    date_of_birth DATE,
    gender VARCHAR(10) NOT NULL DEFAULT '',
    nationality VARCHAR(50) NOT NULL DEFAULT '',
    marital_status VARCHAR(20) NOT NULL DEFAULT '',
    email_address VARCHAR(254),
    phone_number VARCHAR(20),
    current_address TEXT,
    permanent_address TEXT,
    position VARCHAR(100) NOT NULL,
    employment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    role VARCHAR(20) NOT NULL DEFAULT 'Employee',
    hub_id BIGINT,
    hired_date DATE,
    jtp_code VARCHAR(50) NOT NULL DEFAULT '',
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    emergency_contact_name VARCHAR(100) NOT NULL DEFAULT '',
    emergency_contact_phone VARCHAR(20) NOT NULL DEFAULT '',
    tin VARCHAR(20) NOT NULL DEFAULT '',
    sss VARCHAR(20) NOT NULL DEFAULT '',
    philhealth VARCHAR(20) NOT NULL DEFAULT '',
    pagibig VARCHAR(20) NOT NULL DEFAULT '',
    profile_image VARCHAR(500),
    can_login BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_info BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_activity TIMESTAMP WITH TIME ZONE
);

ALTER TABLE employees_employee
    ADD CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_employee_hub FOREIGN KEY (hub_id) REFERENCES employees_hub(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_hub ON employees_employee (hub_id);

CREATE TABLE IF NOT EXISTS employees_hrpermission (
    id BIGSERIAL PRIMARY KEY,
    hr_employee_id BIGINT NOT NULL UNIQUE,
    can_view_employees BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_employee_info BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_payslip BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_employees BOOLEAN NOT NULL DEFAULT FALSE,
    can_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
    can_enable_employee_edit BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_hrpermission
    ADD CONSTRAINT fk_hrpermission_employee FOREIGN KEY (hr_employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS employees_employeedocument (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    file VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL DEFAULT '',
    file_size INTEGER,
    document_type VARCHAR(20) NOT NULL DEFAULT 'other',
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_employeedocument
    ADD CONSTRAINT fk_employeedocument_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS employees_attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    date DATE NOT NULL,
    clock_in_time TIMESTAMP WITH TIME ZONE,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    clock_in_image VARCHAR(500),
    clock_out_image VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'Present',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by BIGINT,
    approved_at TIMESTAMP WITH TIME ZONE,
    clock_in_latitude NUMERIC(10,7),
    clock_in_longitude NUMERIC(10,7),
    clock_out_latitude NUMERIC(10,7),
    clock_out_longitude NUMERIC(10,7)
);

ALTER TABLE employees_attendance
    ADD CONSTRAINT employees_attendance_employee_date_uniq UNIQUE (employee_id, date),
    ADD CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_attendance_approved_by FOREIGN KEY (approved_by) REFERENCES auth_user(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employees_editrequest (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    requested_data JSONB NOT NULL,
    uploaded_files VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT,
    notes TEXT NOT NULL DEFAULT '',
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_editrequest
    ADD CONSTRAINT fk_editrequest_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_editrequest_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_user(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employees_leaverequest (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    leave_type VARCHAR(50) NOT NULL DEFAULT 'Vacation',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT,
    notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_leaverequest
    ADD CONSTRAINT fk_leaverequest_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_leaverequest_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth_user(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employees_leaveattachment (
    id BIGSERIAL PRIMARY KEY,
    leave_request_id BIGINT NOT NULL,
    file VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_leaveattachment
    ADD CONSTRAINT fk_leaveattachment_leaverequest FOREIGN KEY (leave_request_id) REFERENCES employees_leaverequest(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS employees_payroll (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
    lates INTEGER NOT NULL DEFAULT 0,
    absences INTEGER NOT NULL DEFAULT 0,

    standard_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
    basic_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
    overtime_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
    night_differential NUMERIC(10,2) NOT NULL DEFAULT 0,
    ndot NUMERIC(10,2) NOT NULL DEFAULT 0,
    rest_day NUMERIC(10,2) NOT NULL DEFAULT 0,
    rest_day_ot NUMERIC(10,2) NOT NULL DEFAULT 0,
    rest_day_nd NUMERIC(10,2) NOT NULL DEFAULT 0,
    rest_day_ndot NUMERIC(10,2) NOT NULL DEFAULT 0,
    special_holiday NUMERIC(10,2) NOT NULL DEFAULT 0,
    special_holiday_ot NUMERIC(10,2) NOT NULL DEFAULT 0,
    special_holiday_nd NUMERIC(10,2) NOT NULL DEFAULT 0,
    special_holiday_ndot NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_ot NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_nd NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_ndot NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_rd NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_rdot NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_rdnd NUMERIC(10,2) NOT NULL DEFAULT 0,
    legal_holiday_rdndot NUMERIC(10,2) NOT NULL DEFAULT 0,

    incentives NUMERIC(10,2) NOT NULL DEFAULT 0,
    adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
    gas NUMERIC(10,2) NOT NULL DEFAULT 0,
    load NUMERIC(10,2) NOT NULL DEFAULT 0,
    other_allowance NUMERIC(10,2) NOT NULL DEFAULT 0,
    rewards_adjustments NUMERIC(10,2) NOT NULL DEFAULT 0,
    kpi NUMERIC(10,2) NOT NULL DEFAULT 0,
    allowances NUMERIC(10,2) NOT NULL DEFAULT 0,

    late NUMERIC(10,2) NOT NULL DEFAULT 0,
    id_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    uniform NUMERIC(10,2) NOT NULL DEFAULT 0,
    insurance NUMERIC(10,2) NOT NULL DEFAULT 0,
    surety_bond NUMERIC(10,2) NOT NULL DEFAULT 0,
    convenience_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    general_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    deduction_details JSONB NOT NULL DEFAULT '{}'::jsonb,

    sss_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    philhealth_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    pagibig_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
    sss_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    philhealth_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    pagibig_percent NUMERIC(5,2) NOT NULL DEFAULT 0,

    net_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    payslip_image VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_payroll
    ADD CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS employees_livelocation (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_livelocation
    ADD CONSTRAINT fk_livelocation_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS employees_activitylog (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    employee_id BIGINT,
    role VARCHAR(20) NOT NULL DEFAULT 'Employee',
    action VARCHAR(50) NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    ip_address INET,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_activitylog
    ADD CONSTRAINT fk_activitylog_user FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_activitylog_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employees_securityalert (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT,
    alert_type VARCHAR(30) NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'low',
    message TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by BIGINT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_securityalert
    ADD CONSTRAINT fk_securityalert_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_securityalert_resolved_by FOREIGN KEY (resolved_by) REFERENCES auth_user(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employees_savedimage (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    image VARCHAR(500) NOT NULL,
    image_type VARCHAR(20) NOT NULL,
    image_data BYTEA,
    content_type VARCHAR(100),
    original_filename VARCHAR(255),
    edit_request_id BIGINT,
    attendance_id BIGINT,
    leave_attachment_id BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE employees_savedimage
    ADD CONSTRAINT fk_savedimage_employee FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_savedimage_editrequest FOREIGN KEY (edit_request_id) REFERENCES employees_editrequest(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_savedimage_attendance FOREIGN KEY (attendance_id) REFERENCES employees_attendance(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_savedimage_leaveattachment FOREIGN KEY (leave_attachment_id) REFERENCES employees_leaveattachment(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_savedimage_employee_type ON employees_savedimage (employee_id, image_type);
CREATE INDEX IF NOT EXISTS idx_savedimage_employee_created ON employees_savedimage (employee_id, created_at);

COMMIT;
