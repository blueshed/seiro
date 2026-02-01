-- CQRS Domain Modeling Schema
-- Entities and relationships are primary
-- Documents are compositions/views
-- Commands and events operate at document level

-- ============================================
-- FOUNDATION: Stories (traceability)
-- ============================================

CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    narrative TEXT NOT NULL,
    actor TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRIMARY: Entities & Relationships
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
    default_value TEXT,
    UNIQUE(entity_id, name)
);

CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    from_field TEXT NOT NULL,
    to_entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    cardinality TEXT CHECK(cardinality IN ('one', 'many')) DEFAULT 'one',
    description TEXT
);

-- ============================================
-- COMPOSITIONS: Documents
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    root_entity_id INTEGER REFERENCES entities(id)
);

CREATE TABLE IF NOT EXISTS document_includes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    alias TEXT,
    filter TEXT,
    via_relationship_id INTEGER REFERENCES relationships(id),
    UNIQUE(document_id, entity_id, alias)
);

-- ============================================
-- OPERATIONS: Commands & Events
-- ============================================

CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    document_id INTEGER REFERENCES documents(id),
    description TEXT
);

CREATE TABLE IF NOT EXISTS command_params (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    required INTEGER DEFAULT 1,
    UNIQUE(command_id, name)
);

CREATE TABLE IF NOT EXISTS command_affects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    operation TEXT CHECK(operation IN ('create', 'update', 'delete')) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS event_payload (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(event_id, field)
);

CREATE TABLE IF NOT EXISTS command_emits (
    command_id INTEGER NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY (command_id, event_id)
);

-- ============================================
-- FLOWS: Sequences
-- ============================================

CREATE TABLE IF NOT EXISTS sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    document_id INTEGER REFERENCES documents(id),
    description TEXT
);

CREATE TABLE IF NOT EXISTS sequence_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    actor TEXT,
    command_id INTEGER REFERENCES commands(id),
    event_id INTEGER REFERENCES events(id),
    note TEXT,
    UNIQUE(sequence_id, step_order)
);

-- ============================================
-- ACCESS: Permissions
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    condition TEXT
);

-- ============================================
-- TRACEABILITY: Link stories to artifacts
-- ============================================

CREATE TABLE IF NOT EXISTS story_entities (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, entity_id)
);

CREATE TABLE IF NOT EXISTS story_documents (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, document_id)
);

CREATE TABLE IF NOT EXISTS story_commands (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    command_id INTEGER NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, command_id)
);

CREATE TABLE IF NOT EXISTS story_sequences (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    sequence_id INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, sequence_id)
);

-- ============================================
-- INDEXES for common queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attributes_entity ON attributes(entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_document_includes_doc ON document_includes(document_id);
CREATE INDEX IF NOT EXISTS idx_command_params_cmd ON command_params(command_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_permissions_cmd ON permissions(command_id);
