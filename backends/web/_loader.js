const INIT_SYMBOL = Symbol('@ort-web.init');

const FEATURES_NONE = 0;
const FEATURES_WEBGL = 1 << 0;
const FEATURES_WEBGPU = 1 << 1;
const FEATURES_ALL = FEATURES_WEBGL | FEATURES_WEBGPU;

/**
 * @typedef {Object} Dist
 * @property {string} baseUrl
 * @property {string} scriptName
 * @property {string | null} [binaryName]
 * @property {string | null} [wrapperName] defaults to `binaryName` s/\.wasm$/.mjs
 * @property {Record<'main' | 'wrapper' | 'binary', string> | null} integrities
 */

const DEFAULT_DIST_BASE = 'https://cdn.pyke.io/0/pyke:ort-rs/web@1.26.0/';

/** @type {Record<number, Dist>} */
const DEFAULT_DIST = {
	[FEATURES_NONE]: {
		baseUrl: DEFAULT_DIST_BASE,
		scriptName: 'ort.wasm.min.js',
		binaryName: 'ort-wasm-simd-threaded.wasm',
		integrities: {
			main: '4ggJ54ZPWrzCDCSqmu8RUaH2O3910gr75Cc0Csktz64iLB3sk9/eG2esUmVD8qTr',
			wrapper: 'mql1DeKkccJmqNO7cC22MvLHdhPJoGiFjUqWs6WlbQpS14iEFib3UwAuNBoRAjt0',
			binary: 'wr7M1C6iNW3VC/2ZcY8NgYHkS1JqhtT6XO1KrErv3Sr588B9M0NzTOhBco0UgAZj'
		}
	},
	[FEATURES_WEBGL]: {
		baseUrl: DEFAULT_DIST_BASE,
		scriptName: 'ort.webgl.min.js',
		binaryName: 'ort-wasm-simd-threaded.wasm',
		integrities: {
			main: 'tI6HalccceDqeb2Sqq319y23ZWn/PDWJBB1+MMzEnR0xyme1cnQre73GR4ofgdz0',
			wrapper: 'mql1DeKkccJmqNO7cC22MvLHdhPJoGiFjUqWs6WlbQpS14iEFib3UwAuNBoRAjt0',
			binary: 'wr7M1C6iNW3VC/2ZcY8NgYHkS1JqhtT6XO1KrErv3Sr588B9M0NzTOhBco0UgAZj'
		}
	},
	[FEATURES_WEBGPU]: {
		baseUrl: DEFAULT_DIST_BASE,
		scriptName: 'ort.webgpu.min.js',
		binaryName: 'ort-wasm-simd-threaded.jsep.wasm',
		integrities: {
			main: 'kTuUvrXVnMpECkAjGoCTJvTjra+dgDD7542vIfIzC8WoMb48lIpYBnXSUDzPNQa4',
			wrapper: '23n05z35WSh7k+/k5AKko6aY7FDKGElW4GExsegdqY5patkPMUGqhD9bwuCRXr9g',
			binary: 'sY2H39EQhqtIUp/BW/mCM0euCLxa5CAh+cYozlt34yB3MqMNU+trD6yMPgmOY3Rz'
		}
	},
	[FEATURES_ALL]: {
		baseUrl: DEFAULT_DIST_BASE,
		scriptName: 'ort.all.min.js',
		binaryName: 'ort-wasm-simd-threaded.jsep.wasm',
		integrities: {
			main: '04lJbUrL63CfSL8gVAfIATvahdSsw+bjDyXlqSyMWXYl438d6ln9WujFeTIl7n+i',
			wrapper: '23n05z35WSh7k+/k5AKko6aY7FDKGElW4GExsegdqY5patkPMUGqhD9bwuCRXr9g',
			binary: 'sY2H39EQhqtIUp/BW/mCM0euCLxa5CAh+cYozlt34yB3MqMNU+trD6yMPgmOY3Rz'
		}
	}
};

/**
 * @param {string} url
 * @param {'fetch' | 'script' | 'module'} as
 * @param {string} [type]
 * @param {string | null} [integrity]
 */
function preload(url, as, type, integrity) {
	const el = document.createElement('link');
	el.href = url;
	if (as !== 'module') {
		el.rel = 'preload';
		el.setAttribute('as', as);
	} else {
		el.rel = 'modulepreload';
	}
	if (type) {
		el.setAttribute('type', type);
	}
	if (integrity) {
		el.setAttribute('integrity', `sha384-${integrity}`);
	}
	el.setAttribute('crossorigin', 'anonymous');
	document.head.appendChild(el);
}

/**
 * @param {number} features
 * @param {Dist} [dist]
 * @returns {Promise<boolean>}
 */
export function initRuntime(features, dist) {
	if ('ort' in window && /** @type {any} */(window).ort[INIT_SYMBOL]) {
		return Promise.resolve(false);
	}

	if (!dist) {
		if (!(features in DEFAULT_DIST)) {
			return Promise.reject(new Error('Unsupported feature set'));
		}

		dist = DEFAULT_DIST[features];
	}

	/** @param {string} file */
	const relative = file => new URL(file, dist.baseUrl).toString();

	return new Promise((resolve, reject) => {
		// since the order is load main script -> imports wrapper script -> fetches wasm, now would be a good time to
		// start fetching those
		if (dist.binaryName) {
			preload(
				relative(dist.binaryName),
				'fetch',
				'application/wasm',
				dist.integrities && dist.integrities.binary
			);
			preload(
				relative(dist.wrapperName || dist.binaryName.replace(/\.wasm$/, '.mjs')),
				'module',
				undefined,
				dist.integrities && dist.integrities.wrapper
			);
		}

		const script = document.createElement('script');
		script.src = new URL(dist.scriptName, dist.baseUrl).toString();
		if (dist.integrities && dist.integrities.main) {
			script.setAttribute('integrity', `sha384-${dist.integrities && dist.integrities.main}`);
		}
		script.setAttribute('crossorigin', 'anonymous');
		script.addEventListener('load', () => {
			if (!('ort' in window)) {
				return reject(new Error('script loaded but ort not defined'));
			}

			Object.defineProperty(window.ort, INIT_SYMBOL, {
				value: true,
				configurable: false,
				enumerable: false,
				writable: false
			});

			resolve(true);
		});
		script.addEventListener('error', e => {
			reject(e.error);
		});
		document.head.appendChild(script);
	});
}
