import { User } from '../entities/User'
import { MyContext } from 'src/types'
import argon2 from 'argon2'
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql'
import { Session } from 'express-session'
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from '../constants'
import { validateRegister } from '../utils/validateRegister'
import { sendEmail } from '../utils/sendEmail'
import { v4 } from 'uuid'

@InputType()
export class UsernamePasswordInput {
  @Field()
  email: string
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
export class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    if (!req.session.userId) {
      return null
    }

    const user = await em.findOne(User, { id: req.session.userId })
    return user
  }

  @Query(() => [User], { nullable: true })
  async allUsers(@Ctx() { em }: MyContext) {
    const users = await em.find(User, {})
    console.log(users)
    return users
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options)
    if (errors) {
      return { errors }
    }
    const hashedPassword = await argon2.hash(options.password)
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
      email: options.email,
    })
    try {
      await em.persistAndFlush(user)
    } catch (err) {
      if (err.code === '23505')
        // duplicate username error
        // || err.detail.includes('already exists')
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        }
      console.log(err.message)
    }

    req.session.userId = user.id
    return {
      user,
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes('@')
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    )
    if (!user)
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: 'user does not exist',
          },
        ],
      }
    const valid = await argon2.verify(user.password, password)
    if (!valid)
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      }

    req.session.userId = user.id
    console.log(req.session.userId)

    return {
      user,
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve =>
      req.session.destroy(err => {
        res.clearCookie(COOKIE_NAME)
        if (err) {
          console.log(err)
          resolve(false)
          return
        }
        resolve(true)
      })
    )
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, em, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 3)
      return {
        errors: [
          {
            field: 'password',
            message: 'password must be 3 characters or longer',
          },
        ],
      }

    const key = FORGOT_PASSWORD_PREFIX + token
    const userId = await redis.get(key)
    if (!userId) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      }
    }

    const user = await em.findOne(User, { id: parseInt(userId) })

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user does not exist',
          },
        ],
      }
    }

    user.password = await argon2.hash(newPassword)
    await em.persistAndFlush(user)

    req.session.userId = user.id

    redis.del(key)

    return {
      user,
    }
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email })
    if (!user) {
      // email not in db
      return true
    }

    const token = v4()

    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60
    ) // 1h

    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    )

    return true
  }
}

Session
