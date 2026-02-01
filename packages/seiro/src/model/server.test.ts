import { describe, test, expect } from "bun:test";
import { createModel } from "./db";
import { encodePlantUML } from "./encode";
import { generateIndexHtml } from "./html";
import { toId } from "./plantuml";

describe("PlantUML Encoding", () => {
  test("encodes simple diagram", () => {
    const uml = "@startuml\nBob -> Alice : hello\n@enduml";
    const encoded = encodePlantUML(uml);
    expect(encoded).toStartWith("~1");
    expect(encoded.length).toBeGreaterThan(10);
  });

  test("produces consistent output", () => {
    const uml = "@startuml\nclass Foo\n@enduml";
    const encoded1 = encodePlantUML(uml);
    const encoded2 = encodePlantUML(uml);
    expect(encoded1).toBe(encoded2);
  });
});

describe("HTML Generation", () => {
  test("generates index with navigation sections", () => {
    const model = createModel();
    model.addEntity({ name: "User" });
    model.addDocument({ name: "UserProfile" });

    const actors = model.getActors().map(a => toId(a.name));
    const documents = model.getDocuments().map(d => toId(d.name));
    const sequences = model.getSequences().map(s => toId(s.name));
    const entities = model.getEntities().map(e => toId(e.name));
    const commands = model.getCommands().map(c => ({
      name: c.name,
      documents: model.getCommandDocuments(c.id!).map(d => d.name),
    }));

    const html = generateIndexHtml(actors, documents, sequences, entities, commands);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("CQRS Domain Model");
    expect(html).toContain("UserProfile");

    model.close();
  });

  test("generates index with actors and use cases", () => {
    const model = createModel();

    const actorId = model.addActor({ name: "Driver" });
    model.addUseCase({ name: "Claim Shipment", actor_id: actorId });
    model.addDocument({ name: "Dashboard" });

    const actors = model.getActors().map(a => toId(a.name));
    const documents = model.getDocuments().map(d => toId(d.name));
    const sequences = model.getSequences().map(s => toId(s.name));
    const entities = model.getEntities().map(e => toId(e.name));
    const commands = model.getCommands().map(c => ({
      name: c.name,
      documents: model.getCommandDocuments(c.id!).map(d => d.name),
    }));

    const html = generateIndexHtml(actors, documents, sequences, entities, commands);
    expect(html).toContain("Driver");
    expect(html).toContain("Dashboard");

    model.close();
  });

  test("generates index with commands", () => {
    const model = createModel();

    const docId = model.addDocument({ name: "Catalogue" });
    const cmdId = model.addCommand({ name: "product.save" });
    model.addCommandDocument({ command_id: cmdId, document_id: docId });
    model.addEvent({ name: "product_saved", command_id: cmdId });

    const actors = model.getActors().map(a => toId(a.name));
    const documents = model.getDocuments().map(d => toId(d.name));
    const sequences = model.getSequences().map(s => toId(s.name));
    const entities = model.getEntities().map(e => toId(e.name));
    const commands = model.getCommands().map(c => ({
      name: c.name,
      documents: model.getCommandDocuments(c.id!).map(d => d.name),
    }));

    const html = generateIndexHtml(actors, documents, sequences, entities, commands);
    expect(html).toContain("product.save");

    model.close();
  });
});

describe("toId", () => {
  test("converts names to URL-safe ids", () => {
    expect(toId("Save Product")).toBe("Save_Product");
    expect(toId("product.save")).toBe("product_save");
    expect(toId("User")).toBe("User");
  });
});
