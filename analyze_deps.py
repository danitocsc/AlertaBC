import ast
import os
import sys
from collections import defaultdict

def find_imports(file_path):
    """
    Parses a Python file and returns a list of imported module names.
    Handles 'import x', 'import x as y', 'from x import y'.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=file_path)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return []

    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module.split('.')[0])
            elif node.level > 0:
                 # Relative import, simplistic handling
                 pass
    return imports

def get_project_modules(root_dir):
    """
    Returns a mapping of module names to file paths for the project.
    """
    modules = {}
    for root, _, files in os.walk(root_dir):
        if 'venv' in root or '__pycache__' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                module_name = file[:-3]
                full_path = os.path.join(root, file)
                modules[module_name] = full_path
    return modules

def generate_report(root_dir):
    print(f"Analyzing dependencies in: {root_dir}")
    print("-" * 50)
    
    project_modules = get_project_modules(root_dir)
    dependencies = defaultdict(list)
    
    # Analyze each file
    for module_name, file_path in project_modules.items():
        imports = find_imports(file_path)
        
        # Filter mostly for internal dependencies, but we can list all
        for imp in imports:
            if imp in project_modules:
                dependencies[module_name].append(imp)
    
    # Generate Output
    report_lines = []
    report_lines.append("# Reporte de Dependencias del Proyecto")
    report_lines.append(f"Generado automáticamente el {os.popen('date /t').read().strip()}")
    report_lines.append("")
    report_lines.append("## Resumen de Dependencias Internas")
    report_lines.append("Este reporte muestra qué archivos del proyecto dependen de otros archivos locales.")
    report_lines.append("")
    
    if not dependencies:
        report_lines.append("No se encontraron dependencias internas claras (flat structure or no imports).")
        
    for module, deps in sorted(dependencies.items()):
        if deps:
            report_lines.append(f"### {module}.py")
            report_lines.append("Depende de:")
            for dep in sorted(deps):
                report_lines.append(f"- **{dep}.py**")
            report_lines.append("")
            
    # Also list orphans (files imported by no one)
    all_imported = set()
    for deps in dependencies.values():
        all_imported.update(deps)
        
    orphans = [m for m in project_modules if m not in all_imported and m != 'cliente' and m != 'app_core'] # Exclude known entry points
    
    if orphans:
        report_lines.append("## Archivos Huérfanos (Posibles)")
        report_lines.append("Estos archivos no son importados por ningún otro módulo Python detectado (pueden ser scripts de entrada):")
        for orphan in sorted(orphans):
            report_lines.append(f"- {orphan}.py")
            
    output_path = os.path.join(root_dir, 'DEPENDENCY_REPORT.md')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
        
    print(f"Reporte generado en: {output_path}")
    print("-" * 50)
    print(open(output_path, 'r', encoding='utf-8').read())

if __name__ == "__main__":
    generate_report(os.getcwd())
