 #importing modules
import os
import numpy as np
import errno
import segyio
from flask import Flask, render_template, request
import simplejson

# declaring app name
app = Flask(__name__)

def files_color_map(pasta):
    """
    Carrega o caminho dos arquivos dos mapas de cores

    :parâmetro pasta: caminho da pasta
    return: um dicionário com os caminhos e nomes do mapas de cores
    """
    
    file_list = os.listdir(pasta)
    paths = []
    colorMaps = []

    for f in file_list:
        x = f.split('.')
        colorMaps.append(x[0])
        paths.append('/' + pasta + '/' + f)

    l = {
        'path': paths,
        'colorMaps': colorMaps,
    }
    return l

def path_hierarchy(path):
    """
    Monta a hierarquia das pastas

    :parâmetro path: caminho
    return: um dicionário com a hierarquia das pastas e arquivos
    """
    hierarchy = {
        'text': os.path.basename(path),
    }

    try:
        hierarchy['nodes'] = [
            path_hierarchy(os.path.join(path, contents))
            for contents in os.listdir(path)
        ]
    except OSError as e:
        if e.errno != errno.ENOTDIR:
            raise

    return hierarchy

def loadTreeView():
    """
    Carrega a tree view

    return: um dicionário com a tree view
    """
    path = 'segy'
    tree = path_hierarchy(path)

    for i in range(len(tree['nodes'])):

        node = tree['nodes'][i]

    return tree['nodes']

@app.route('/seismic2D', methods=["GET","POST"])
def readSeismic2D():
    """
    Carrega os dados do arquivo escolhido

    return: um dicionário com as informações do arquivo
    """
    global dataSeismic
    path = simplejson.loads(request.form['javascript_data_2D'])

    with segyio.open('segy/' + path, "r", ignore_geometry=True) as f:
        # Memory map file for faster reading (especially if file is big...)
        f.mmap()
        dataSeismic = f.trace.raw[:].T

    response = {"data": (dataSeismic.flatten()).tolist(),
                "height": dataSeismic.shape[0],
                "width": dataSeismic.shape[1],
                "minValue":np.min(dataSeismic).tolist(),
                "maxValue":np.max(dataSeismic).tolist(),
                }
    
    return response

@app.route('/')
def homepage():
    """
    define a home page
    """
    path = 'static/textures'
    return render_template("index.html", treeData=simplejson.dumps(loadTreeView()), color_Map=files_color_map(path))


if __name__ == '__main__':
    # running app
    app.run(debug=True)
