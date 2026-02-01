import { describe, test, expect } from "bun:test";
import { ModelDB, createModel } from "./db";
import { generateEntityDiagram, generateSequenceDiagram, generateUseCaseDiagram } from "./plantuml";

describe("ModelDB", () => {
  test("creates in-memory database", () => {
    const model = createModel();
    expect(model).toBeInstanceOf(ModelDB);
    model.close();
  });

  test("adds and retrieves entities", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment", description: "A delivery" });
    const driverId = model.addEntity({ name: "Driver", description: "Delivers shipments" });

    const entities = model.getEntities();
    expect(entities).toHaveLength(2);
    expect(entities.map((e) => e.name)).toContain("Shipment");
    expect(entities.map((e) => e.name)).toContain("Driver");

    model.close();
  });

  test("adds attributes to entities", () => {
    const model = createModel();

    const entityId = model.addEntity({ name: "Shipment" });
    model.addAttribute({ entity_id: entityId, name: "status", type: "text" });
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
      from_field: "driver_id",
      to_entity_id: driverId,
      cardinality: "one",
    });

    const rels = model.getRelationshipsFrom(shipmentId);
    expect(rels).toHaveLength(1);
    expect(rels[0].to_entity_id).toBe(driverId);

    model.close();
  });

  test("creates documents with includes", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment" });
    const driverId = model.addEntity({ name: "Driver" });

    const docId = model.addDocument({
      name: "DriverDashboard",
      root_entity_id: driverId,
    });

    model.addDocumentInclude({
      document_id: docId,
      entity_id: shipmentId,
      filter: "driver_id = @user",
    });

    const includes = model.getDocumentIncludes(docId);
    expect(includes).toHaveLength(1);
    expect(includes[0].filter).toBe("driver_id = @user");

    model.close();
  });

  test("creates commands with params and events", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment" });
    const docId = model.addDocument({ name: "DriverDashboard" });

    const cmdId = model.addCommand({
      name: "ClaimShipment",
      document_id: docId,
    });

    model.addCommandParam({ command_id: cmdId, name: "shipment_id", type: "integer" });
    model.addCommandAffects({ command_id: cmdId, entity_id: shipmentId, operation: "update" });

    const eventId = model.addEvent({ name: "ShipmentClaimed" });
    model.addEventPayload({ event_id: eventId, field: "shipment_id", type: "integer" });
    model.addCommandEmits(cmdId, eventId);

    const params = model.getCommandParams(cmdId);
    expect(params).toHaveLength(1);

    const events = model.getCommandEvents(cmdId);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("ShipmentClaimed");

    model.close();
  });

  test("creates sequences with steps", () => {
    const model = createModel();

    const docId = model.addDocument({ name: "DriverDashboard" });
    const cmdId = model.addCommand({ name: "ClaimShipment", document_id: docId });
    const eventId = model.addEvent({ name: "ShipmentClaimed" });

    const seqId = model.addSequence({ name: "ClaimFlow", document_id: docId });
    model.addSequenceStep({ sequence_id: seqId, step_order: 1, actor: "Driver", command_id: cmdId });
    model.addSequenceStep({ sequence_id: seqId, step_order: 2, event_id: eventId, note: "Notifies dispatcher" });

    const steps = model.getSequenceSteps(seqId);
    expect(steps).toHaveLength(2);
    expect(steps[0].actor).toBe("Driver");
    expect(steps[1].note).toBe("Notifies dispatcher");

    model.close();
  });

  test("links stories to artifacts", () => {
    const model = createModel();

    const entityId = model.addEntity({ name: "Shipment" });
    const storyId = model.addStory({
      title: "Driver claims shipment",
      narrative: "As a driver, I want to claim available shipments...",
      actor: "Driver",
    });

    model.linkStoryEntity(storyId, entityId);

    const stories = model.getEntityStories(entityId);
    expect(stories).toHaveLength(1);
    expect(stories[0].title).toBe("Driver claims shipment");

    model.close();
  });
});

describe("PlantUML Generation", () => {
  test("generates entity diagram", () => {
    const model = createModel();

    const shipmentId = model.addEntity({ name: "Shipment" });
    model.addAttribute({ entity_id: shipmentId, name: "status", type: "text" });

    const driverId = model.addEntity({ name: "Driver" });
    model.addRelationship({
      from_entity_id: shipmentId,
      from_field: "driver_id",
      to_entity_id: driverId,
    });

    const diagram = generateEntityDiagram(model);
    expect(diagram).toContain("@startuml");
    expect(diagram).toContain("class Shipment");
    expect(diagram).toContain("class Driver");
    expect(diagram).toContain("Shipment --> ");
    expect(diagram).toContain("@enduml");

    model.close();
  });

  test("generates sequence diagram", () => {
    const model = createModel();

    const docId = model.addDocument({ name: "Dashboard" });
    const cmdId = model.addCommand({ name: "ClaimShipment", document_id: docId });
    const eventId = model.addEvent({ name: "ShipmentClaimed" });

    const seqId = model.addSequence({ name: "ClaimFlow", document_id: docId });
    model.addSequenceStep({ sequence_id: seqId, step_order: 1, actor: "Driver", command_id: cmdId });
    model.addSequenceStep({ sequence_id: seqId, step_order: 2, event_id: eventId });

    const diagram = generateSequenceDiagram(model, seqId);
    expect(diagram).toContain("@startuml");
    expect(diagram).toContain("title ClaimFlow");
    expect(diagram).toContain('actor "Driver"');
    expect(diagram).toContain("@enduml");

    model.close();
  });

  test("generates use case diagram", () => {
    const model = createModel();

    const cmdId = model.addCommand({ name: "ClaimShipment" });
    model.addPermission({ command_id: cmdId, actor: "Driver" });

    const diagram = generateUseCaseDiagram(model);
    expect(diagram).toContain("@startuml");
    expect(diagram).toContain('actor "Driver"');
    expect(diagram).toContain('usecase "ClaimShipment"');
    expect(diagram).toContain("@enduml");

    model.close();
  });
});
