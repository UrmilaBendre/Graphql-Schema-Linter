import { validate } from 'graphql/validation';
import { buildASTSchema } from 'graphql/utilities/buildASTSchema';
import { validateSDL } from 'graphql/validation/validate';
import { validateSchema } from 'graphql/type/validate';
import { ValidationError } from './validation_error';

export function validateSchemaDefinition(
  schemaDefinitionAST,
  rules,
  configuration
) {
  let schemaErrors = validateSDL(schemaDefinitionAST);
  if (schemaErrors.length > 0) {
    return sortErrors(
      schemaErrors.map(error => {
        return new ValidationError(
          'invalid-graphql-schema',
          error.message,
          error.nodes
        );
      })
    );
  }

  const schema = buildASTSchema(schemaDefinitionAST, {
    commentDescriptions: configuration.getCommentDescriptions(),
    assumeValidSDL: true,
    assumeValid: true,
  });

  schema.__validationErrors = undefined;
  schemaErrors = validateSchema(schema);
  if (schemaErrors.length > 0) {
    return sortErrors(
      schemaErrors.map(error => {
        return new ValidationError(
          'invalid-graphql-schema',
          error.message,
          error.nodes || schemaDefinitionAST
        );
      })
    );
  }

  const rulesWithConfiguration = rules.map(rule => {
    return ruleWithConfiguration(rule, configuration);
  });

  const errors = validate(schema, schemaDefinitionAST, rulesWithConfiguration);

  const sortedErrors = sortErrors(errors);

  return sortedErrors;
}

function sortErrors(errors) {
  return errors.sort((a, b) => {
    return a.locations[0].line - b.locations[0].line;
  });
}

function ruleWithConfiguration(rule, configuration) {
  if (rule.length == 2) {
    return function(context) {
      return rule(configuration, context);
    };
  } else {
    return rule;
  }
}
