-- CQRS Domain Modeling Schema
-- Documents are central - they're what clients get and update
-- Entities define the shape, sequences show the flow

-- ============================================
-- DOMAIN: Entities & Relationships
-- ============================================

CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    nullable INTEGER DEFAULT 0,
    UNIQUE(entity_id, name)
);

CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    from_field TEXT NOT NULL,
    to_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    cardinality TEXT CHECK(cardinality IN ('one', 'many')) DEFAULT 'one',
    is_reference INTEGER DEFAULT 0,  -- 0 = composed (embedded), 1 = reference (by ID)
    description TEXT
);

-- ============================================
-- DOCUMENTS: What the client holds
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS document_params (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(document_id, name)
);

CREATE TABLE IF NOT EXISTS document_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sql TEXT NOT NULL,
    UNIQUE(document_id, name)
);

CREATE TABLE IF NOT EXISTS document_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE(document_id, entity_id)
);

-- ============================================
-- ACTORS & USE CASES
-- ============================================

CREATE TABLE IF NOT EXISTS actors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS use_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    description TEXT
);

-- ============================================
-- COMMANDS & EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS command_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(command_id, document_id)
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    command_id INTEGER REFERENCES commands(id) ON DELETE SET NULL,
    description TEXT,
    entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL
);

-- ============================================
-- SEQUENCES: CQRS flows
-- ============================================

CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('actor', 'client', 'server', 'database', 'queue')) NOT NULL
);

CREATE TABLE IF NOT EXISTS sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    use_case_id INTEGER REFERENCES use_cases(id) ON DELETE SET NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS sequence_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    from_participant_id INTEGER NOT NULL REFERENCES participants(id),
    to_participant_id INTEGER NOT NULL REFERENCES participants(id),
    message TEXT NOT NULL,
    step_type TEXT CHECK(step_type IN ('call', 'return', 'event', 'subscribe', 'query', 'note')) DEFAULT 'call',
    note TEXT,
    UNIQUE(sequence_id, step_order)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attributes_entity ON attributes(entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_doc ON document_queries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_entities_doc ON document_entities(document_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_actor ON use_cases(actor_id);
CREATE INDEX IF NOT EXISTS idx_command_documents_cmd ON command_documents(command_id);
CREATE INDEX IF NOT EXISTS idx_events_command ON events(command_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON sequence_steps(sequence_id);
