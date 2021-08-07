
/**
 * Ferramenta de Visualização 2D de Dados Científicos
 * @author Mayara Gomes Silva <mayaragomys@gmail.com>
 */

//definir os sombreadores
//--------------Vertex shader program-----------
//transforma o vértice de entrada de seu sistema de coordenadas, no qual cada eixo tem um intervalo de -1,0 a 1,0
const vsSource = `#version 300 es
    layout(location = 0) in vec4 aVertexPosition;
    layout(location = 1) in vec2 aTextureCoord;

    uniform mat4 mvpMatrix;

    out vec2 texCoord;

    void main() {
        gl_Position = mvpMatrix * aVertexPosition;
        texCoord = aTextureCoord;
    }
`;


//--------------Fragment shader program-----------
const fsSource = `#version 300 es
    precision mediump float;

    out vec4 FragColor;

    in vec2 texCoord;

    uniform sampler2D data;
    uniform sampler2D colorMapTex;

    uniform float maxValue;
    uniform float minValue;

    uniform int flip;

    void main() {
        vec4 color;
        // recebe o valor dos dados (imagens) pertencentes ao  primeiro canal textura
        float value = texture(data, texCoord).x;

        if (value > maxValue){
            value = maxValue;
        }
        else if(value < minValue){
            value = minValue;
        }

        // normalizando o valor
        value = (value - minValue) * (1.0/(maxValue - minValue));

        if (flip == 1){
            // cor que será pintado o valor, busca a cor no mapa de cores
            color = vec4(texture(colorMapTex, vec2(1.0-value, texCoord.y)).rgb, 1.0);
        }
        else{
            color = vec4(texture(colorMapTex, vec2(value, texCoord.y)).rgb, 1.0);
        }

        // cor que será pintado o valor, busca a cor no mapa de cores
        //color = texture(colorMapTex, vec2(value, 0.5));

        // retorna a cor
        FragColor = color;
    }
`;

var square;
//Criação da camera
var camera;
//Criação do Canvas
var canvas;
var canvasContext = document.querySelector("#webglCanvas");
canvasContext.width = $('.center').width() - $('.icon-bar').width(), // largura do canvas
canvasContext.height = $('.center').height() // altura do canvas

//Criação do objeto
var square = new Square();
//Criação da camera
var camera = new Camera(0.0, 0, -2.0, 1,1,1,0,0);
//Criação do Canvas
canvas = new Canvas(canvasContext, vsSource, fsSource, square, camera, '');

//Inicializando o contexto gl e o canvas
canvas.initCanvas();


/**
     * Esta função desenha o dado (imagem) na tela
     * @param {Object} gl - contexto webgl
*/
function draw (){

    canvas.resize(canvas.gl.canvas);
    canvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    canvas.gl.clearDepth(1.0);
    canvas.gl.viewport(0.0, 0.0, canvas.canvas.width, canvas.canvas.height);
    canvas.gl.clear(canvas.gl.COLOR_BUFFER_BIT | canvas.gl.DEPTH_BUFFER_BIT);
    canvas.gl.blendFunc(canvas.gl.ONE, canvas.gl.ONE_MINUS_SRC_ALPHA);
    
/*==================== MATRIX ====================== */
    const projectionMatrix = mat4.create();
    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const mvpMatrix = mat4.create();

    // note: glmatrix.js always has the first argument as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     Math.PI / 3,
                     canvas.gl.canvas.clientWidth / canvas.gl.canvas.clientHeight,
                     0.01,
                     100.0);

    // Set the drawing position to the "identity" point, which is the center of the scene.
    mat4.identity(viewMatrix);
    mat4.translate(viewMatrix, viewMatrix,
                  [canvas.camera.camPosX,
                   canvas.camera.camPosY,
                   canvas.camera.camPosZ]);

   mat4.identity(modelMatrix);
   mat4.scale(modelMatrix, modelMatrix,
              [canvas.camera.scaleX,
               canvas.camera.scaleY,
               1.0]);


    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);


    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
      const numComponents = 3;  // pull out 3 values per iteration
      const type = canvas.gl.FLOAT;    // the data in the buffer is 32bit floats
      const normalize = false;  // don't normalize
      const stride = 0;         // how many bytes to get from one set of values to the next
                                // 0 = use type and numComponents above
      const offset = 0;         // how many bytes inside the buffer to start from
      canvas.gl.bindBuffer(canvas.gl.ARRAY_BUFFER, canvas.buffers.position);
      canvas.gl.vertexAttribPointer(
          canvas.programInfo.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      canvas.gl.enableVertexAttribArray(
          canvas.programInfo.attribLocations.vertexPosition);
    }

    // Diga ao WebGL como extrair as coordenadas de textura de
    // o buffer de coordenadas de textura no atributo textureCoord.
    {
        const numComponents = 2;
        const type = canvas.gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        canvas.gl.bindBuffer(canvas.gl.ARRAY_BUFFER, canvas.buffers.textureCoord);
        canvas.gl.vertexAttribPointer(
            canvas.programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        canvas.gl.enableVertexAttribArray(
            canvas.programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL which indices to use to index the vertices
    canvas.gl.bindBuffer(canvas.gl.ELEMENT_ARRAY_BUFFER, canvas.buffers.indices);    

    // Tell WebGL to use our program when drawing
    canvas.gl.useProgram(canvas.programInfo.program);

    // Setar as uniforms
    canvas.gl.uniform1f(canvas.programInfo.uniformLocations.maxValue, canvas.camera.max);
    canvas.gl.uniform1f(canvas.programInfo.uniformLocations.minValue, canvas.camera.min);
    canvas.gl.uniform1i(canvas.programInfo.uniformLocations.flip, canvas.flip);

    // Set the shader uniforms
    canvas.gl.uniformMatrix4fv(canvas.programInfo.uniformLocations.mvpMatrix, false, mvpMatrix);
    
    {
        const vertexCount = canvas.buffers.indexNum;
        const type = canvas.gl.UNSIGNED_SHORT;
        const offset = 0;
        canvas.gl.drawElements(canvas.gl.TRIANGLES, vertexCount, type, offset);
    }

    //Ativação das texturas
    canvas.gl.activeTexture(canvas.gl.TEXTURE0);
    canvas.gl.bindTexture(canvas.gl.TEXTURE_2D, canvas.colorMap);
    canvas.gl.uniform1i(canvas.programInfo.texture.colorMap, 0);

    canvas.gl.activeTexture(canvas.gl.TEXTURE1);
    canvas.gl.bindTexture(canvas.gl.TEXTURE_2D, canvas.sismicTex);
    canvas.gl.uniform1i(canvas.programInfo.texture.textureLocation, 1);

}

// // /*================= Butons events ======================*/
var zoomStep = 0.02;
var translation = 1;
var zoomActivate = 1;

$(function () {  
    /**
     * Aumenta o zoom da visualização da imagem
     */
    $("#zoomIn").click(function () {  
        canvas.camera.scaleX = canvas.camera.scaleX + zoomStep; 
        canvas.camera.scaleY = canvas.camera.scaleY + zoomStep;
        //Atualizando o código do UI
        SlidersWidgets.scaleX.updateValue(canvas.camera.scaleX)
        SlidersWidgets.scaleY.updateValue(canvas.camera.scaleY)
        canvas.draw(canvas.gl)
    });  
    /**
     * Diminui o zoom da visualização da imagem
     */
    $("#zoomOut").click(function () {  
        if (canvas.camera.scaleX > zoomStep && canvas.camera.scaleY > zoomStep) {
            canvas.camera.scaleX = canvas.camera.scaleX - zoomStep; 
            canvas.camera.scaleY = canvas.camera.scaleY - zoomStep;
            //Atualizando o código do UI
            SlidersWidgets.scaleX.updateValue(canvas.camera.scaleX)
            SlidersWidgets.scaleY.updateValue(canvas.camera.scaleY)
            canvas.draw(canvas.gl)
        }
    });  
    /**
     * Inverte as cores da imagem
     */
    $("#flip").click(function () {  
        if(canvas.flip == 0){
            canvas.flip = 1;
        }
        else{
            canvas.flip = 0;
        }
        canvas.draw(canvas.gl);
    });  
    /**
     * Desabilita a movimentação da imagem com o mouse
     */
    $("#mouseTranslation").click(function () {  
        if(translation == 0){
            translation = 1;
        }
        else{
            translation = 0;
        }
    });
    /**
     * Desabilita o zoom da imagem com o mouse
     */
    $("#mouseZoom").click(function () {  
        if(zoomActivate == 0){
            zoomActivate = 1;
        }
        else{
            zoomActivate = 0;
        }
    });
});


// // /*================= Mouse events ======================*/

var drag = false;
var startX, startY;
// the accumulated horizontal(X) & vertical(Y) panning the user has done in total
var panX=0;
var panY=0;
/**
 * Verifica a movimentação do mouse
 * @param {Object} e 
 */
var mouseDown = function(e) {
    e.preventDefault();
    const rect = canvas.canvas.getBoundingClientRect();
    const cssX = e.pageX - rect.left;
    const cssY = e.pageY - rect.top;

    // get normalized 0 to 1 position across and down canvas
    const normalizedX = cssX / canvas.canvas.width;
    const normalizedY = cssY / canvas.canvas.height;

    // convert to clip space
    const clipX = normalizedX *  2 - 1;
    const clipY = normalizedY * -2 + 1;

    // calc the starting mouse X,Y for the drag
    startX= clipX;
    startY= clipY;

    drag = true;
   //return false;
};

/**
 * Esta função verifica de houve click com o mouse no canvas
 * @param {Object} e - evento do mouse no canvas
 */
var mouseUp = function(e){
   e.preventDefault();
   drag = false;
};
 
/**
 * Atualiza as configurações da câmera de acordo com a movimentação do mouse
 * @param {*} e - evento do mouse no canvas
 */
var mouseMove = function(e) {

    if (translation == 1){
        e.preventDefault();

        if (!drag) return false;
            
        const rect = canvas.canvas.getBoundingClientRect();
        const cssX = e.pageX - rect.left;
        const cssY = e.pageY - rect.top;

        // get normalized 0 to 1 position across and down canvas
        const normalizedX = cssX / canvas.canvas.width;
        const normalizedY = cssY / canvas.canvas.height;

        // convert to clip space
        const clipX = normalizedX *  2 - 1;
        const clipY = normalizedY * -2 + 1;

        // get the current mouse position
        var mouseX= clipX;
        var mouseY= clipY;

        // dx & dy are the distance the mouse has moved since the last mousemove event
        var dx = mouseX-startX;
        var dy = mouseY-startY;

        // accumulate the net panning done
        panX += (dx/4);
        panY += (dy/4);

        canvas.camera.camPosX = panX;
        canvas.camera.camPosY = panY;
        canvas.draw (canvas.gl);

        startX = mouseX;
        startY = mouseY;
    }

};

/**
 * 
 * @param {Objetc} e 
 */
var mouseWheel  = function(e) {

    if (zoomActivate == 1){
        e.preventDefault();

        let scaleX = canvas.camera.scaleX;
        let scaleY = canvas.camera.scaleY;
        let scaleFactor = 0.02;

        // calculate scale direction 6 new value
        let direction = e.deltaY > 0 ? -1 : 1;
        scaleX += scaleFactor * direction;
        scaleY += scaleFactor * direction;
        
        if (scaleX > 0.02 && scaleY > 0.02){
            // apply new scale
            canvas.camera.scaleX = scaleX; 
            canvas.camera.scaleY = scaleY;

            //Atualizando o código do UI
            SlidersWidgets.scaleX.updateValue(scaleX)
            SlidersWidgets.scaleY.updateValue(scaleY)
            console.log("mouse")
            canvas.draw (canvas.gl);

        }
    }
}

// Eventos para o mouse
canvas.canvas.addEventListener("wheel", mouseWheel, false);
canvas.canvas.addEventListener("mousedown", mouseDown, false);
canvas.canvas.addEventListener("mouseup", mouseUp, false);
canvas.canvas.addEventListener("mouseout", mouseUp, false);
canvas.canvas.addEventListener("mousemove", mouseMove, false);

const selectElement = document.querySelector('#colormapID');
selectElement.addEventListener('change', (event) => {  
    canvas.colorMapChange();  
});


/**
 * Configuração dos sliders de scala
 */
 var SlidersWidgets = webglSlider.setupUI(document.querySelector('#ui'), canvas.camera, [
    { type: 'slider',  name:'Scale x:', key: 'scaleX',    min: 0, max: 10, change: draw(), precision: 2, step: 0.001, },
    { type: 'slider',  name:'Scale y:', key: 'scaleY',    min:  0, max: 10, change: draw(), precision: 2, step: 0.001, }
]);


//Chama a função init para inicializar o canvas depois do html carregado
window.onload = function(){
    //Atribuindo o caminho dos mapas de cores 
    canvas.colorMapPath = colorMapPath; 
}


