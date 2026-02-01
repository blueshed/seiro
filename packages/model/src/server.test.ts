import { describe, test, expect } from "bun:test";
import { createModel } from "./db";
import { encodePlantUML } from "./encode";
import { generateIndexHtml, generateStoryHtml, generateNavData } from "./html";

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

    const html = generateIndexHtml(model);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Domain Model Viewer");
    expect(html).toContain("UserProfile");

    model.close();
  });

  test("generates nav data with all sections", () => {
    const model = createModel();
    model.addEntity({ name: "Order" });
    const docId = model.addDocument({ name: "OrderDoc" });
    const seqId = model.addSequence({ name: "CreateOrder" });
    model.addStory({ title: "Test Story", narrative: "A test" });

    const nav = generateNavData(model);

    expect(nav.overview.items).toHaveLength(3);
    expect(nav.documents.items).toHaveLength(1);
    expect(nav.documents.items[0].label).toBe("OrderDoc");
    expect(nav.sequences.items).toHaveLength(1);
    expect(nav.sequences.items[0].label).toBe("CreateOrder");
    expect(nav.stories.items).toHaveLength(1);

    model.close();
  });

  test("generates story HTML", () => {
    const model = createModel();
    const storyId = model.addStory({
      title: "User Registration",
      narrative: "As a visitor, I want to register",
      actor: "Visitor",
    });

    const html = generateStoryHtml(model, storyId);
    expect(html).toContain("User Registration");
    expect(html).toContain("As a visitor, I want to register");
    expect(html).toContain("Actor: Visitor");

    model.close();
  });

  test("returns null for non-existent story", () => {
    const model = createModel();
    const html = generateStoryHtml(model, 999);
    expect(html).toBeNull();
    model.close();
  });

  test("escapes HTML in story content", () => {
    const model = createModel();
    const storyId = model.addStory({
      title: "Test <script>alert('xss')</script>",
      narrative: "Some & content < > \"",
    });

    const html = generateStoryHtml(model, storyId);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");

    model.close();
  });
});
