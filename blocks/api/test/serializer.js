/**
 * WordPress dependencies
 */
import { createElement, Component } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { text } from '../source';
import serialize, {
	getCommentAttributes,
	getBeautifulContent,
	getSaveContent,
	serializeAttributes,
	getCommentDelimitedContent,
	serializeBlock,
} from '../serializer';
import {
	getBlockTypes,
	registerBlockType,
	unregisterBlockType,
	setUnknownTypeHandlerName,
} from '../registration';
import { createBlock } from '../';

describe( 'block serializer', () => {
	afterEach( () => {
		setUnknownTypeHandlerName( undefined );
		getBlockTypes().forEach( block => {
			unregisterBlockType( block.name );
		} );
	} );

	describe( 'getBeautifulContent()', () => {
		it( 'returns beautiful content', () => {
			const content = getBeautifulContent( '<div><div>Beautiful</div></div>' );

			expect( content ).toBe( '<div>\n    <div>Beautiful</div>\n</div>' );
		} );
	} );

	describe( 'getSaveContent()', () => {
		describe( 'function save', () => {
			it( 'should return string verbatim', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => attributes.fruit,
						name: 'core/fruit',
					},
					{ fruit: 'Bananas' }
				);

				expect( saved ).toBe( 'Bananas' );
			} );

			it( 'should return element as string if save returns element', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => createElement( 'div', null, attributes.fruit ),
						name: 'core/fruit',
					},
					{ fruit: 'Bananas' }
				);

				expect( saved ).toBe( '<div class="wp-block-fruit">Bananas</div>' );
			} );

			it( 'should use the namespace in the classname for non-core blocks', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => createElement( 'div', null, attributes.fruit ),
						name: 'myplugin/fruit',
					},
					{ fruit: 'Bananas' }
				);

				expect( saved ).toBe( '<div class="wp-block-myplugin-fruit">Bananas</div>' );
			} );

			it( 'should allow overriding the className', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => createElement( 'div', null, attributes.fruit ),
						name: 'myplugin/fruit',
						className: 'apples',
					},
					{ fruit: 'Bananas' }
				);

				expect( saved ).toBe( '<div class="apples">Bananas</div>' );
			} );

			it( 'should include additional classes in block attributes', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => createElement( 'div', {
							className: 'fruit',
						}, attributes.fruit ),
						name: 'myplugin/fruit',
						className: 'apples',
					},
					{
						fruit: 'Bananas',
						className: 'fresh',
					}
				);

				expect( saved ).toBe( '<div class="apples fruit fresh">Bananas</div>' );
			} );

			it( 'should not add a className if falsy', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => createElement( 'div', null, attributes.fruit ),
						name: 'myplugin/fruit',
						className: false,
					},
					{ fruit: 'Bananas' }
				);

				expect( saved ).toBe( '<div>Bananas</div>' );
			} );

			it( 'should add an id if the block supports anchors', () => {
				const saved = getSaveContent(
					{
						save: ( { attributes } ) => createElement( 'div', null, attributes.fruit ),
						supportAnchor: true,
						name: 'myplugin/fruit',
						className: false,
					},
					{ fruit: 'Bananas', anchor: 'my-fruit' }
				);

				expect( saved ).toBe( '<div id="my-fruit">Bananas</div>' );
			} );
		} );

		describe( 'component save', () => {
			it( 'should return element as string', () => {
				const saved = getSaveContent(
					{
						save: class extends Component {
							render() {
								return createElement( 'div', null, this.props.attributes.fruit );
							}
						},
						name: 'core/fruit',
					},
					{ fruit: 'Bananas' }
				);

				expect( saved ).toBe( '<div>Bananas</div>' );
			} );
		} );
	} );

	describe( 'getCommentAttributes()', () => {
		it( 'should return an empty set if no attributes provided', () => {
			const attributes = getCommentAttributes( {}, {} );

			expect( attributes ).toEqual( {} );
		} );

		it( 'should only return attributes which are not matched from content', () => {
			const attributes = getCommentAttributes( {
				fruit: 'bananas',
				category: 'food',
				ripeness: 'ripe',
			}, {
				fruit: {
					type: 'string',
					source: text(),
				},
				category: {
					type: 'string',
				},
				ripeness: {
					type: 'string',
				},
			} );

			expect( attributes ).toEqual( {
				category: 'food',
				ripeness: 'ripe',
			} );
		} );

		it( 'should skip attributes whose values are undefined', () => {
			const attributes = getCommentAttributes( {
				fruit: 'bananas',
				ripeness: undefined,
			}, {
				fruit: {
					type: 'string',
				},
				ripeness: {
					type: 'string',
				},
			} );

			expect( attributes ).toEqual( { fruit: 'bananas' } );
		} );
	} );

	describe( 'serializeAttributes()', () => {
		it( 'should not break HTML comments', () => {
			expect( serializeAttributes( { a: '-- and --' } ) ).toBe( '{"a":"\\u002d\\u002d and \\u002d\\u002d"}' );
		} );
		it( 'should not break standard-non-compliant tools for "<"', () => {
			expect( serializeAttributes( { a: '< and <' } ) ).toBe( '{"a":"\\u003c and \\u003c"}' );
		} );
		it( 'should not break standard-non-compliant tools for ">"', () => {
			expect( serializeAttributes( { a: '> and >' } ) ).toBe( '{"a":"\\u003e and \\u003e"}' );
		} );
		it( 'should not break standard-non-compliant tools for "&"', () => {
			expect( serializeAttributes( { a: '& and &' } ) ).toBe( '{"a":"\\u0026 and \\u0026"}' );
		} );
	} );

	describe( 'getCommentDelimitedContent()', () => {
		it( 'should generate empty attributes void', () => {
			const content = getCommentDelimitedContent(
				'core/test-block',
				{},
				''
			);

			expect( content ).toBe( '<!-- wp:core/test-block /-->' );
		} );

		it( 'should generate empty attributes non-void', () => {
			const content = getCommentDelimitedContent(
				'core/test-block',
				{},
				'Delicious'
			);

			expect( content ).toBe( '<!-- wp:core/test-block -->\nDelicious\n<!-- /wp:core/test-block -->' );
		} );

		it( 'should generate non-empty attributes void', () => {
			const content = getCommentDelimitedContent(
				'core/test-block',
				{ fruit: 'Banana' },
				''
			);

			expect( content ).toBe(
				'<!-- wp:core/test-block {"fruit":"Banana"} /-->'
			);
		} );

		it( 'should generate non-empty attributes non-void', () => {
			const content = getCommentDelimitedContent(
				'core/test-block',
				{ fruit: 'Banana' },
				'Delicious'
			);

			expect( content ).toBe(
				'<!-- wp:core/test-block {"fruit":"Banana"} -->\nDelicious\n<!-- /wp:core/test-block -->'
			);
		} );
	} );

	describe( 'serializeBlock()', () => {
		describe( '"more" block', () => {
			beforeEach( () => {
				registerBlockType( 'core/more', {
					category: 'layout',

					attributes: {
						text: {
							type: 'string',
						},
						noTeaser: {
							type: 'boolean',
							default: false,
						},
					},

					save: ( { attributes } ) => attributes.text,
				} );
			} );

			it( 'serializes without text', () => {
				const block = createBlock( 'core/more', {} );

				const content = serializeBlock( block );

				expect( content ).toBe( '<!--more-->' );
			} );

			it( 'serializes with text', () => {
				const block = createBlock( 'core/more', {
					text: 'Read more!',
				} );

				const content = serializeBlock( block );

				expect( content ).toBe( '<!--more Read more!-->' );
			} );

			it( 'serializes with no teaser', () => {
				const block = createBlock( 'core/more', {
					noTeaser: true,
				} );

				const content = serializeBlock( block );

				expect( content ).toBe( '<!--more-->\n<!--noteaser-->' );
			} );
		} );

		it( 'serializes the fallback block without comment delimiters', () => {
			registerBlockType( 'core/unknown-block', {
				category: 'common',
				attributes: {
					fruit: {
						type: 'string',
					},
				},
				save: ( { attributes } ) => attributes.fruit,
			} );
			setUnknownTypeHandlerName( 'core/unknown-block' );
			const block = createBlock( 'core/unknown-block', { fruit: 'Bananas' } );

			const content = serializeBlock( block );

			expect( content ).toBe( 'Bananas' );
		} );
	} );

	describe( 'serialize()', () => {
		beforeEach( () => {
			const blockType = {
				attributes: {
					throw: {
						type: 'boolean',
					},
					defaulted: {
						type: 'boolean',
						default: false,
					},
					content: {
						type: 'string',
						source: text(),
					},
					stuff: {
						type: 'string',
					},
				},
				save( { attributes } ) {
					if ( attributes.throw ) {
						throw new Error();
					}

					return <p dangerouslySetInnerHTML={ { __html: attributes.content } } />;
				},
				category: 'common',
			};
			registerBlockType( 'core/test-block', blockType );
		} );

		it( 'should serialize the post content properly', () => {
			const block = createBlock( 'core/test-block', {
				content: 'Ribs & Chicken',
				stuff: 'left & right -- but <not>',
			} );
			const expectedPostContent = '<!-- wp:core/test-block {"stuff":"left \\u0026 right \\u002d\\u002d but \\u003cnot\\u003e"} -->\n<p class="wp-block-test-block">Ribs & Chicken</p>\n<!-- /wp:core/test-block -->';

			expect( serialize( [ block ] ) ).toEqual( expectedPostContent );
			expect( serialize( block ) ).toEqual( expectedPostContent );
		} );

		it( 'should preserve content for invalid block', () => {
			const block = createBlock( 'core/test-block', {
				content: 'Incorrect',
			} );

			block.isValid = false;
			block.originalContent = 'Correct';

			expect( serialize( block ) ).toEqual(
				'<!-- wp:core/test-block -->\nCorrect\n<!-- /wp:core/test-block -->'
			);
		} );

		it( 'should preserve content for crashing block', () => {
			const block = createBlock( 'core/test-block', {
				content: 'Incorrect',
				throw: true,
			} );

			block.originalContent = 'Correct';

			expect( serialize( block ) ).toEqual(
				'<!-- wp:core/test-block {"throw":true} -->\nCorrect\n<!-- /wp:core/test-block -->'
			);
		} );
	} );
} );
