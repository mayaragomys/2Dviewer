
/**
 * Classe responsável pela definição da camera
 */
class Camera{
    /**
     * 
     * @param {Number} camPosX posição da câmera em X
     * @param {Number} camPosY posição da câmera em Y
     * @param {Number} camPosZ posição da câmera em Z
     * @param {Number} scaleX escala em X
     * @param {Number} scaleY escala em Y
     * @param {Number} scaleZ escala em Z
     * @param {Number} max máximo valor
     * @param {Number} min mínimo valor
     */
    constructor(camPosX, camPosY, camPosZ, scaleX, scaleY, scaleZ, max, min) {
        this.camPosX = camPosX,
        this.camPosY = camPosY,
        this.camPosZ = camPosZ,
        this.scaleX = scaleX,
        this.scaleY = scaleY,
        this.scaleZ = scaleZ,
        this.max = max,
        this.min = min
    }
}

/**
 * Classe responsável pela definição de um objeto quadrado
 */
class Square{
    constructor(){
        this.positions = [
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,
        ];

        this.textureCoordinates = [
            // Front
            0.0,  1.0,
            1.0,  1.0,
            1.0,  0.0,
            0.0,  0.0,
        ]

        this.indices = [
            0,  1,  2,
            0,  2,  3,
        ];

    }
    /**
     * 
     * @returns vetor com as posições do objeto
     */
    getPositions() {
        return this.positions;
    }
    /**
     * 
     * @returns vetor com as coordenadas de textura do objeto
     */
    getTextureCoordinates() {
        return this.textureCoordinates;
    }
    /**
     * 
     * @returns vetor com os índices do objeto
     */
    getIndices() {
        return this.indices;
    }

}

/**
 * Classe responsável pelas informações do canvas
 */
class Canvas{
    /**
     * 
     * @param {Object} canvasContext elemento canvas
     * @param {Object} vsSource shader vertex
     * @param {Object} fsSource shader fragment
     * @param {Object} square objeto quadrado
     * @param {Object} camera objeto câmera
     * @param {string} colorMapPath caminho dos mapas de textura
     */
    constructor(canvasContext, vsSource, fsSource, square, camera, colorMapPath){
        this.canvas = canvasContext;
        this.gl = undefined
        this.programInfo = undefined
        this.buffers = undefined
        this.vShader = vsSource
        this.fShader = fsSource
        this.square = square
        this.flip = 0;
        this.sismicTex = undefined
        this.colorMap = undefined;
        this.camera = camera
        this.colorMapId = 0;
        this.colorMapPath = colorMapPath;
        this.heightSeismic = undefined;
        this.widthSeismic = undefined;
        this.data = undefined;

    }

    /**
     * Inicializa o contexto GL e o canvas
     */
    initCanvas(){
        // Initialize the gl context
        try {
            // Try to grab the standard context. If it fails, fallback to experimental.
            this.gl = this.canvas.getContext("webgl2",{
            premultipliedAlpha: false  // Ask for non-premultiplied alpha
            });
            this.gl.getExtension('OES_texture_float_linear');
            this.gl.getExtension('OES_texture_float');
            this.gl.getExtension('EXT_color_buffer_float');
    
        } catch (e) {}
        if (!this.gl) {
            window.alert("Error: Could not retrieve WebGL Context");
            return;
        }

        // Inicializa um programa de shader
        const shaderProgram = this.initShaderProgram(this.gl, vsSource, fsSource);

        // Colete todas as informações necessárias para usar o programa shader.
        this.programInfo = {
            program: shaderProgram,
            attribLocations: {
            vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: this.gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
            },
            uniformLocations: {
                mvpMatrix: this.gl.getUniformLocation(shaderProgram, 'mvpMatrix'),
                minValue: this.gl.getUniformLocation(shaderProgram, 'minValue'),
                maxValue: this.gl.getUniformLocation(shaderProgram, "maxValue"),
                flip: this.gl.getUniformLocation(shaderProgram, 'flip'),
            },
            texture:{
                textureLocation: this.gl.getUniformLocation(shaderProgram, "data"),
                colorMap: this.gl.getUniformLocation(shaderProgram, "colorMapTex"),
            },
        };

        // chamama a rotina que constrói todos os objetos que iremos desenhar.
        this.buffers = this.initBuffers(this.gl, this.square.getPositions(), this.square.getTextureCoordinates(), this.square.getIndices());

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.BLEND);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        //Habilita atributo desejado do vertice.
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
    }

    /**
     * Esta função inicializa um programa de shader
     * @param {Object} gl - contexto webgl
     * @param {string} vsSource - shader de vértice
     * @param {string} fsSource - shader de fragmento
     * @returns Objeto com o programa do shader
     */
    initShaderProgram(gl, vsSource, fsSource){
        //cria os dois shaders
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);


        //If creating the shader program failed, alert
        if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
            alert('Não foi possível inicializar o programa de sombreador: ' + gl.getProgramInfolog(shaderProgram));
            return null;
        }
        return shaderProgram;

    }

    /**
     * Cria e Compila um Shader de um determinado tipo
     * @param {Object} gl contexto webGL
     * @param {string} type tipo de shader
     * @param {string} source informações do shader
     * @returns Objeto com o shader Compilado
     */
    loadShader(gl, type, source){
        const shader = gl.createShader(type);

        //Envia a fonte para o objeto shader
        gl.shaderSource(shader, source);

        //Compile the shader program
        gl.compileShader(shader)

        //Verifica se compilou com sucesso
        if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            alert('Ocorreu um erro ao compilar os sombreadores: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;

    }

    /**
     * Esta função Inicializa os buffers
     * @param {Object} gl - contexto webgl
     * @param {vector} positions - vertices do objeto
     * @param {vector} textureCoordinates - coordenadas de textura do objeto
     * @param {vector} indices - indices dos triângulos
     * @returns Objeto com as informações do buffers
     */
    initBuffers(gl, positions, textureCoordinates, indices) {

        //create vertices VBO in program.vPosition
        // Create a buffer for the square's positions.
        const positionBuffer = gl.createBuffer();
        // Define buffer como corrente. (Selecione o positionBuffer como aquele para aplicar o buffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        //Aloca buffer e copia dados.
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        //create vertices VBO in program.texture
        // Agora configure as coordenadas de textura
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        //Aloca buffer e copia dados.
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        //create vertices VBO in program.indices
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // Now send the element array to GL
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return {
                position: positionBuffer,
                textureCoord: textureCoordBuffer,
                indices: indexBuffer,
                indexNum: indices.length,
            };
    }

    /**
     * Inicializa uma textura e carrega uma imagem. Quando a imagem terminar de carregar, copie-a na textura.
     * @param {Object} gl - contexto webgl
     * @param {vector} data - valores dos dados da imagem
     * @param {number} width - largura da imagem
     * @param {number} height - altura da imagem
     * @returns {Object} textura
     */
    loadTexture(gl, data, width, height) {

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            gl.texImage2D(
                gl.TEXTURE_2D, // target
                0, // mip level
                gl.R32F, // internal format
                width, height, // width and height
                0, // border
                gl.RED, //format
                gl.FLOAT, // type
                new Float32Array(data) // texture data
            );

        gl.generateMipmap(gl.TEXTURE_2D);

        return texture;
    }

    /**
     * Inicializa uma textura e carrega uma imagem. Em relação ao mapa de cor
     * @param {Object} gl - contexto webgl
     * @param {vector} colormap_path - dados da imagem do mapa de cor
     * @returns textura do mapa de cor
     */
    createColormapTexture(gl, colormap_path) {

        var tex = gl.createTexture();
        var texture = new Image();
        texture.src = colormap_path;

        texture.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            texture.width,
            texture.height,
            0,
            gl.RGBA,
            gl.FLOAT,
            texture);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        return tex;
    }

    /**
     * Esta função renderiza o canvas
     * @param {Object} canvas - contexto canvas
     */
    resize(canvas) {
        // Lookup the size the browser is displaying the canvas.
        var displayWidth  = canvas.clientWidth;
        var displayHeight = canvas.clientHeight;

        // Check if the canvas is not the same size.
        if (canvas.width  != displayWidth ||
            canvas.height != displayHeight) {

            // Make the canvas the same size
            canvas.width  = displayWidth;
            canvas.height = displayHeight;
        }
    }

    /**
     * Esta função cria a textura com os dados científicos e desenha na tela
     * @param {vector} data - vetor com os valores dos dados
     * @param {number} heightSeismic - altura da imagem
     * @param {number} widthSeismic - largura da imagem
     * @param {number} minValue - valor mínimo entre os dados
     * @param {number} maxValue - valor máximo entre os dados
     */
    render2D(data,
        heightSeismic,
        widthSeismic,
        minValue,
        maxValue){

        this.camera.scaleX = 1.0;
        this.camera.scaleY = 1.0;
        this.camera.scaleZ = 1.0;
        this.camera.max = maxValue;
        this.camera.min = minValue;
        this.heightSeismic = heightSeismic;
        this.widthSeismic = widthSeismic;
        this.data = data;       
        console.log('Color map', colorMapPath[this.colorMapId])

        //Carrega textura dos dados sismicos
        this.sismicTex = this.loadTexture(this.gl, this.data, this.widthSeismic, this.heightSeismic);
        //Carrega textura do mapa de cores
        this.colorMap = this.createColormapTexture(this.gl, this.colorMapPath[this.colorMapId]);
           
    }

    /**
     * Esta função define um mapa de textura
     */
    colorMapChange() {
        
        this.colorMapId = document.getElementById("colormapID").value;
        this.colorMap = this.createColormapTexture(this.gl, this.colorMapPath[this.colorMapId]);

    }

}