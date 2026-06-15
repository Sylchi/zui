const std = @import("std");

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{});

    // ── WASM Binary ─────────────────────────────────────────
    const wasm = b.addExecutable(.{
        .name = "zui",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/wasm_entry.zig"),
            .target = b.resolveTargetQuery(.{
                .cpu_arch = .wasm32,
                .os_tag = .freestanding,
            }),
            .optimize = optimize,
        }),
    });
    wasm.entry = .disabled;
    wasm.rdynamic = true;

    const wasm_install = b.addInstallArtifact(wasm, .{});
    wasm_install.dest_sub_path = "zui.wasm";
    const wasm_step = b.step("wasm", "Build WASM binary");
    wasm_step.dependOn(&wasm_install.step);

    // ── Generated Docs (from Zig /// doc comments) ──────────
    const doc_exe = b.addObject(.{
        .name = "zui-docs",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/wasm_entry.zig"),
            .target = b.resolveTargetQuery(.{}),
        }),
    });
    const docs = doc_exe.getEmittedDocs();
    const install_docs = b.addInstallDirectory(.{
        .source_dir = docs,
        .install_dir = .prefix,
        .install_subdir = "docs",
    });
    const doc_step = b.step("docs", "Generate HTML API docs from /// comments");
    doc_step.dependOn(&install_docs.step);

    // ── Tests (native) ─────────────────────────────────────
    const test_step = b.step("test", "Run ZUI component tests");
    const test_exe = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/ui/infra/Component.zig"),
            .target = b.resolveTargetQuery(.{}),
            .optimize = optimize,
        }),
    });
    test_step.dependOn(&b.addRunArtifact(test_exe).step);
}
