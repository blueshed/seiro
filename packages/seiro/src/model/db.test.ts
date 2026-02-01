import { describe, test, expect } from "bun:test";
import { ModelDB, createModel } from "./db";
import { generateEntitiesPuml, generateSequencePuml, generateUseCasesPuml } from "./plantuml";

describe("ModelDB", () => {
  test("creates in-memory database", () => {
    const model = createModel();
    expect(model).toBeInstanceOf(ModelDB);
    model.close();
  });

  test("adds and retrieves entities", () => {
    const model = createModel();

    model.addEntity({ name: "Shipment", description: "A delivery" });
    model.addEntity({ name: "Driver", description: "Delivers shipments" });

    const entities = model.getEntities();
    expect(entities).toHaveLength(2);
    expect(entities.map((e) => e.name)).toContain("Shipment");
    expect(entities.map((e) => e.name)).toContain("Driver");

    model.close();
  });

  test("adds attributes to entities", () => {
    const model = createModel();

    const entityId = model.addEntity({ name: "Shipment" });
    model.addAttribute({ entity_id: entityId, name: "status", type: "string" });
    model.addAttribute({ entity_id: entityId, name: "driver_id", type: "integer", nullable: true });

    const attrs = model.getAttributes(entityId);
    expect(attrs).toHaveLength(2);

    model.close();
  });

  test("creates relationships between entities", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment" });
    const driverId = model.addEntity({ name: "Driver" });

    model.addRelationship({
      from_entity_id: shipmentId,
      from_field: "driver",
      to_entity_id: driverId,
      cardinality: "one",
    });

    const rels = model.getRelationshipsFrom(shipmentId);
    expect(rels).toHaveLength(1);
    expect(rels[0].to_entity_id).toBe(driverId);

    model.close();
  });

  test("creates documents with entities and queries", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment" });
    const driverId = model.addEntity({ name: "Driver" });

    const docId = model.addDocument({
      name: "DriverDashboard",
      description: "Dashboard for drivers",
    });

    model.addDocumentEntity({ document_id: docId, entity_id: shipmentId });
    model.addDocumentEntity({ document_id: docId, entity_id: driverId });
    model.addDocumentQuery({ document_id: docId, name: "shipments", sql: "SELECT * FROM shipments" });

    const entities = model.getDocumentEntities(docId);
    expect(entities).toHaveLength(2);

    const queries = model.getDocumentQueries(docId);
    expect(queries).toHaveLength(1);
    expect(queries[0].name).toBe("shipments");

    model.close();
  });

  test("creates commands with events", () => {
    const model = createModel();

    const docId = model.addDocument({ name: "DriverDashboard" });

    const cmdId = model.addCommand({ name: "shipment.claim", description: "Claim a shipment" });
    model.addCommandDocument({ command_id: cmdId, document_id: docId });

    const eventId = model.addEvent({ name: "shipment_claimed", command_id: cmdId });

    const events = model.getCommandEvents(cmdId);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("shipment_claimed");

    const docs = model.getCommandDocuments(cmdId);
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe("DriverDashboard");

    model.close();
  });

  test("creates actors and use cases", () => {
    const model = createModel();

    const actorId = model.addActor({ name: "Driver", description: "Delivers shipments" });
    model.addUseCase({ name: "Claim Shipment", actor_id: actorId });
    model.addUseCase({ name: "Complete Delivery", actor_id: actorId });

    const useCases = model.getUseCasesByActor(actorId);
    expect(useCases).toHaveLength(2);
    expect(useCases.map(uc => uc.name)).toContain("Claim Shipment");

    model.close();
  });

  test("creates sequences with steps", () => {
    const model = createModel();

    const actorId = model.addActor({ name: "Driver" });
    const ucId = model.addUseCase({ name: "Claim Shipment", actor_id: actorId });

    const browserId = model.addParticipant({ name: "Browser", type: "actor" });
    const clientId = model.addParticipant({ name: "Client", type: "client" });
    const serverId = model.addParticipant({ name: "Server", type: "server" });

    const seqId = model.addSequence({ name: "Claim Flow", use_case_id: ucId });
    model.addSequenceStep({
      sequence_id: seqId,
      step_order: 1,
      from_participant_id: browserId,
      to_participant_id: clientId,
      message: "cmd('shipment.claim', {...})",
    });
    model.addSequenceStep({
      sequence_id: seqId,
      step_order: 2,
      from_participant_id: clientId,
      to_participant_id: serverId,
      message: "{ cmd: 'shipment.claim', data }",
    });

    const steps = model.getSequenceSteps(seqId);
    expect(steps).toHaveLength(2);
    expect(steps[0].message).toContain("shipment.claim");

    model.close();
  });
});

describe("PlantUML Generation", () => {
  test("generates entity diagram", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment" });
    model.addAttribute({ entity_id: shipmentId, name: "status", type: "string" });

    const driverId = model.addEntity({ name: "Driver" });
    model.addRelationship({
      from_entity_id: shipmentId,
      from_field: "driver",
      to_entity_id: driverId,
    });

    const diagram = generateEntitiesPuml(model);
    expect(diagram).toContain("@startuml");
    expect(diagram).toContain("class Shipment");
    expect(diagram).toContain("class Driver");
    expect(diagram).toContain("@enduml");

    model.close();
  });

  test("generates sequence diagram", () => {
    const model = createModel();

    const browserId = model.addParticipant({ name: "Browser", type: "actor" });
    const serverId = model.addParticipant({ name: "Server", type: "server" });

    const seqId = model.addSequence({ name: "Test Flow" });
    model.addSequenceStep({
      sequence_id: seqId,
      step_order: 1,
      from_participant_id: browserId,
      to_participant_id: serverId,
      message: "request",
    });

    const diagram = generateSequencePuml(model, "Test Flow");
    expect(diagram).toContain("@startuml");
    expect(diagram).toContain("Test Flow");
    expect(diagram).toContain("@enduml");

    model.close();
  });

  test("generates use case diagram", () => {
    const model = createModel();

    const actorId = model.addActor({ name: "Driver" });
    model.addUseCase({ name: "Claim Shipment", actor_id: actorId });

    const diagram = generateUseCasesPuml(model);
    expect(diagram).toContain("@startuml");
    expect(diagram).toContain("Driver");
    expect(diagram).toContain("Claim Shipment");
    expect(diagram).toContain("@enduml");

    model.close();
  });
});
