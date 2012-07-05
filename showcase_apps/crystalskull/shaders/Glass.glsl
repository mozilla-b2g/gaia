// Based on Cg tutorial: http://http.developer.nvidia.com/CgTutorial/cg_tutorial_chapter07.html

//# GlassVertex
varying vec3 vNormal;
varying vec3 t;
varying vec3 tr;
varying vec3 tg;
varying vec3 tb;
varying float rfac;

uniform vec3 chromaticDispertion;
uniform float bias;
uniform float scale;
uniform float power;

void main(void) {
	gl_Position = mvpMatrix() * vec4(aVertexPosition, 1.0);
	vNormal = normalize(nMatrix * aVertexNormal);	
	vec3 incident = normalize( (vec4(aVertexPosition, 1.0) * mMatrix).xyz - uEyePosition);
	
	t = reflect(incident, vNormal);	
	tr = refract(incident, vNormal, chromaticDispertion.x);
	tg = refract(incident, vNormal, chromaticDispertion.y);
	tb = refract(incident, vNormal, chromaticDispertion.z);
	
	// bias, scale, 1, power
	rfac = bias + scale * pow(1.0 + dot(incident, vNormal), power);
}

//# GlassFragment
uniform samplerCube uCubemap;

varying vec3 vNormal;
varying vec3 t;
varying vec3 tr;
varying vec3 tg;
varying vec3 tb;
varying float rfac;

void main(void) {
	vec4 ref = textureCube(uCubemap, t);

	vec4 ret = vec4(1);
	ret.r = textureCube(uCubemap, tr).r;
	ret.g = textureCube(uCubemap, tg).g;
	ret.b = textureCube(uCubemap, tb).b;
	
	gl_FragColor = ret * rfac + ref * (1.0 - rfac);
}
