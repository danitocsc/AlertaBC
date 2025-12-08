import os
import re
import ast
from collections import defaultdict

def get_files(root_dir, extensions):
    file_list = []
    for root, dirs, files in os.walk(root_dir):
        if 'venv' in root or '.git' in root or '__pycache__' in root or 'node_modules' in root or 'deprecated' in root:
            continue
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_list.append(os.path.join(root, file))
    return file_list

def analyze_python_imports(file_path):
    imports = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=file_path)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
    except:
        pass
    return imports

def find_flask_routes(file_path):
    routes = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Simple regex for @app.route('...')
            matches = re.findall(r"@app\.route\s*\(\s*['\"]([^'\"]+)['\"]", content)
            routes.extend(matches)
    except:
        pass
    return routes

def find_frontend_api_calls(file_path):
    calls = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Matches fetch(', $.get(', $.post(', etc.
            # Very basic regex, can be improved
            matches = re.findall(r"(?:fetch|get|post|url:)\s*[(:]\s*['\"]([^'\"]+)['\"]", content)
            # Filter for likely API paths (start with / or http)
            calls.extend([m for m in matches if m.startswith('/') or m.startswith('http')])
    except:
        pass
    return calls

def generate_report(root_dir):
    py_files = get_files(root_dir, ['.py'])
    js_html_files = get_files(root_dir, ['.js', '.html'])
    
    report = []
    report.append("# Informe Integral de Dependencias del Proyecto")
    report.append(f"Directorio: {root_dir}")
    report.append("")
    
    # 1. Backend Analysis
    report.append("## 1. Backend (Python) - Estructura y Rutas")
    defined_routes = {}
    
    # Map Routes
    for py_file in py_files:
        filename = os.path.basename(py_file)
        routes = find_flask_routes(py_file)
        if routes:
            report.append(f"### {filename} (Controlador/API Entry Point)")
            report.append("**Rutas Definidas:**")
            for r in routes:
                report.append(f"- `{r}`")
                defined_routes[r] = filename
            report.append("")
            
    report.append("### Dependencias de Módulos Internos")
    project_module_names = {os.path.basename(f)[:-3] for f in py_files}
    
    for py_file in py_files:
        filename = os.path.basename(py_file)
        imports = analyze_python_imports(py_file)
        internal_deps = imports.intersection(project_module_names)
        if internal_deps:
            report.append(f"- **{filename}** depende de: {', '.join([f'`{d}.py`' for d in internal_deps])}")

    report.append("")
    
    # 2. Frontend Analysis
    report.append("## 2. Frontend (JS/HTML) - Llamadas a API")
    used_routes = set()
    
    for client_file in js_html_files:
        filename = os.path.basename(client_file)
        api_calls = find_frontend_api_calls(client_file)
        
        if api_calls:
            report.append(f"### {filename}")
            report.append("**Endpoints invocados:**")
            for call in api_calls:
                # Remove query params for matching
                base_call = call.split('?')[0]
                
                # Check match
                status = "✅ Encontrado" if base_call in defined_routes else "⚠️ Posible Mismatch / Externo"
                if base_call in defined_routes:
                    used_routes.add(base_call)
                    
                report.append(f"- `{call}` -> {status} (en {defined_routes.get(base_call, '???')})")
            report.append("")

    report.append("## 3. Resumen de Cobertura")
    unused_routes = set(defined_routes.keys()) - used_routes
    if unused_routes:
        report.append("**Endpoints del Backend NO detectados explícitamente en el Frontend:**")
        # Filter static common ones
        filtered = [r for r in unused_routes if r not in ['/', '/events', '/send_alert']]
        if filtered:
            for r in filtered:
                report.append(f"- `{r}`")
        else:
            report.append("La mayoría de los endpoints parecen estar en uso o son rutas base.")
    else:
        report.append("Todos los endpoints backend definidos parecen ser utilizados por el frontend.")
        
    return "\n".join(report)

if __name__ == "__main__":
    report_content = generate_report(os.getcwd())
    with open("COMPREHENSIVE_REPORT.md", "w", encoding='utf-8') as f:
        f.write(report_content)
    print(report_content)
